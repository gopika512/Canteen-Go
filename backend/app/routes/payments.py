"""
payments.py — Razorpay integration for Smart Canteen

Endpoints:
  POST /api/payments/create-order  → Creates a Razorpay order, returns razorpay_order_id
  POST /api/payments/verify        → Verifies signature, saves order + payment record
"""

import hmac
import hashlib
import uuid
from datetime import datetime
from typing import List, Optional

import razorpay
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import jwt as pyjwt

from app.config import settings
from app.database import orders_collection, payments_collection
from app.models.order import OrderItem

router = APIRouter()

# ---------------------------------------------------------------------------
# Razorpay client — initialized with Key ID and Key Secret from .env
# ---------------------------------------------------------------------------
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class CreateOrderRequest(BaseModel):
    amount: float  # Total in ₹ (rupees, not paise)


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str   # e.g. "pay_QxXXXXXXXXXX"
    razorpay_order_id:   str   # e.g. "order_QxXXXXXXXXX"
    razorpay_signature:  str   # HMAC-SHA256 signature from Razorpay
    student_name:        str
    cart_items:          List[OrderItem]
    total_amount:        float


# ---------------------------------------------------------------------------
# Helper — decode JWT to get student email
# ---------------------------------------------------------------------------

def _get_email(authorization: Optional[str]) -> str:
    """Extract email from Bearer JWT. Raises 401 if missing or invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = authorization.split(" ")[1]
        payload = pyjwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------------------------------------------------------------------------
# POST /api/payments/create-order
# ---------------------------------------------------------------------------

@router.post("/create-order")
async def create_razorpay_order(
    request: CreateOrderRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Step 1 of checkout:
    Frontend calls this to get a Razorpay order_id.
    The frontend then opens the Razorpay Checkout modal with this order_id.
    """
    email = _get_email(authorization)

    # Guard: keys not configured
    if settings.RAZORPAY_KEY_ID == "rzp_test_PLACEHOLDER":
        raise HTTPException(
            status_code=503,
            detail="Razorpay keys not configured. Add RAZORPAY_KEY_ID and "
                   "RAZORPAY_KEY_SECRET to backend/.env",
        )

    amount_paise = int(request.amount * 100)  # Razorpay expects paise (₹1 = 100 paise)

    try:
        rz_order = razorpay_client.order.create({
            "amount":          amount_paise,
            "currency":        "INR",
            "payment_capture": 1,  # Auto-capture on success
        })
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Razorpay order creation failed: {str(exc)}",
        )

    return {
        "razorpay_order_id": rz_order["id"],
        "amount":            amount_paise,
        "currency":          "INR",
        "key_id":            settings.RAZORPAY_KEY_ID,  # Frontend needs this to open modal
    }


# ---------------------------------------------------------------------------
# POST /api/payments/verify
# ---------------------------------------------------------------------------

@router.post("/verify")
async def verify_payment(
    request: VerifyPaymentRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Step 2 of checkout:
    After the Razorpay modal closes successfully, frontend sends:
      - razorpay_payment_id
      - razorpay_order_id
      - razorpay_signature

    Backend verifies the HMAC-SHA256 signature to confirm the payment is genuine.

    ✅ Valid signature → create canteen order, generate token + pickup_qr_uuid
    ❌ Invalid signature → save FAILED record, raise 400
    """
    email = _get_email(authorization)
    now   = datetime.utcnow().isoformat()

    # --- Signature verification ---
    # Razorpay signature = HMAC-SHA256(key=KeySecret, msg="order_id|payment_id")
    message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    expected_sig = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    signature_valid = hmac.compare_digest(expected_sig, request.razorpay_signature)

    if not signature_valid:
        # Save a FAILED payment record for audit
        await payments_collection.insert_one({
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_order_id":   request.razorpay_order_id,
            "payment_status":      "FAILED",
            "student_email":       email,
            "amount":              request.total_amount,
            "created_at":          now,
        })
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed — invalid signature. "
                   "Do not retry; contact support.",
        )

    # --- Payment is genuine — create the canteen order ---
    count        = await orders_collection.count_documents({})
    token_number = count + 1
    pickup_uuid  = str(uuid.uuid4())   # e.g. "a7f3c2d1-4b5e-4f2a-9c3d-1e5f7a9b0c2d"

    order_doc = {
        # Core order info
        "token_number":  token_number,
        "student_name":  request.student_name,
        "student_email": email,
        "items":         [item.dict() for item in request.cart_items],
        "total_amount":  request.total_amount,
        "status":        "pending",

        # Payment details
        "payment_id":          request.razorpay_payment_id,
        "razorpay_order_id":   request.razorpay_order_id,
        "payment_status":      "PAID",
        "paid_at":             now,

        # Pickup QR (contains ONLY the uuid — no passwords, no JWT, no sensitive data)
        "pickup_qr_uuid": pickup_uuid,
        "qr_used":        False,
        "verified_at":    None,  # Set when admin scans the pickup QR
        "verified_by":    None,  # Admin email set when QR is scanned

        "created_at": now,
    }

    result = await orders_collection.insert_one(order_doc)
    order_db_id = str(result.inserted_id)

    # Save clean payment audit record
    await payments_collection.insert_one({
        "razorpay_payment_id": request.razorpay_payment_id,
        "razorpay_order_id":   request.razorpay_order_id,
        "payment_status":      "PAID",
        "student_email":       email,
        "amount":              request.total_amount,
        "order_db_id":         order_db_id,
        "token_number":        token_number,
        "paid_at":             now,
        "created_at":          now,
    })

    return {
        "message":        "Payment verified. Order placed successfully.",
        "token":          token_number,
        "order_id":       order_db_id,
        "pickup_qr_uuid": pickup_uuid,
        "payment_status": "PAID",
        "payment_id":     request.razorpay_payment_id,
        "paid_amount":    request.total_amount,
    }
