"""
orders.py — Canteen order management routes

Note: Order creation (POST /) is now handled by payments.py (POST /api/payments/verify).
      Orders are only created after successful Razorpay payment verification.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from datetime import datetime
import jwt as pyjwt

from app.config import settings
from app.database import orders_collection

router = APIRouter()


# ---------------------------------------------------------------------------
# JWT helper
# ---------------------------------------------------------------------------

def decode_token(authorization: Optional[str]) -> Optional[str]:
    """Extract email (sub) from Bearer JWT. Returns None if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = pyjwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except Exception:
        return None


# ---------------------------------------------------------------------------
# GET /api/orders/active
# ---------------------------------------------------------------------------

@router.get("/active")
async def get_active_orders():
    """
    Public: returns all non-completed orders for the live token board.
    Also used by TokenStatus page to find pickup_qr_uuid by token_number.
    """
    orders = await orders_collection.find(
        {"status": {"$ne": "completed"}}
    ).to_list(100)
    for order in orders:
        order["id"] = str(order.pop("_id"))
    return orders


# ---------------------------------------------------------------------------
# GET /api/orders/history
# ---------------------------------------------------------------------------

@router.get("/history")
async def get_order_history(authorization: Optional[str] = Header(None)):
    """Student: fetch their own past orders, most recent first."""
    email = decode_token(authorization)
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    orders = await orders_collection.find(
        {"student_email": email}
    ).sort("created_at", -1).to_list(100)

    for order in orders:
        order["id"] = str(order.pop("_id"))
    return orders


# ---------------------------------------------------------------------------
# GET /api/orders/analytics
# ---------------------------------------------------------------------------

@router.get("/analytics")
async def get_analytics():
    """Admin: summary stats — total orders, revenue, top items, status breakdown."""
    all_orders = await orders_collection.find({}).to_list(1000)

    total_orders  = len(all_orders)
    total_revenue = sum(o.get("total_amount", 0) for o in all_orders)
    avg_order_val = round(total_revenue / total_orders, 2) if total_orders > 0 else 0

    # Item popularity
    item_counts: dict = {}
    for order in all_orders:
        for item in order.get("items", []):
            name = item.get("item_name", "Unknown")
            qty  = item.get("quantity", 1)
            item_counts[name] = item_counts.get(name, 0) + qty

    top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Status breakdown
    status_counts: dict = {}
    for order in all_orders:
        s = order.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "total_orders":     total_orders,
        "total_revenue":    total_revenue,
        "avg_order_value":  avg_order_val,
        "top_items":        [{"name": k, "count": v} for k, v in top_items],
        "status_breakdown": status_counts,
    }


# ---------------------------------------------------------------------------
# PUT /api/orders/{token_number}/status
# ---------------------------------------------------------------------------

@router.put("/{token_number}/status")
async def update_status(token_number: int, status: str):
    """Admin: update order status (pending → preparing → ready → completed)."""
    result = await orders_collection.update_one(
        {"token_number": token_number},
        {"$set": {"status": status}},
    )
    if result.modified_count == 1:
        return {"message": "Status updated"}
    raise HTTPException(status_code=404, detail="Order not found")


# ---------------------------------------------------------------------------
# POST /api/orders/verify-qr
# ---------------------------------------------------------------------------

@router.post("/verify-qr")
async def verify_pickup_qr(
    pickup_qr_uuid: str,
    authorization: Optional[str] = Header(None),
):
    """
    Admin scans a student's Pickup QR to mark order as collected.

    Security:
    - QR contains ONLY the pickup_qr_uuid (no passwords, no JWT, no token number)
    - One-time use: qr_used=True after first scan
    - verified_at and verified_by (admin email) are recorded

    Returns:
    - 200: "Order Verified Successfully" + order details
    - 400: "QR Already Used"
    - 404: "Invalid QR — Order not found"
    """
    admin_email = decode_token(authorization)
    if not admin_email:
        raise HTTPException(status_code=401, detail="Admin authentication required")

    order = await orders_collection.find_one({"pickup_qr_uuid": pickup_qr_uuid})

    if not order:
        raise HTTPException(status_code=404, detail="Invalid QR — Order not found")

    if order.get("qr_used", False):
        raise HTTPException(
            status_code=400,
            detail="QR Already Used — This order has already been collected.",
        )

    # First valid scan: mark as collected
    verified_at = datetime.utcnow().isoformat()
    await orders_collection.update_one(
        {"pickup_qr_uuid": pickup_qr_uuid},
        {
            "$set": {
                "qr_used":     True,
                "status":      "completed",
                "verified_at": verified_at,
                "verified_by": admin_email,
            }
        },
    )

    return {
        "message":      "Order Verified Successfully",
        "token_number": order["token_number"],
        "student_name": order.get("student_name", ""),
        "total_amount": order.get("total_amount", 0),
        "payment_id":   order.get("payment_id", ""),
        "verified_at":  verified_at,
        "verified_by":  admin_email,
    }