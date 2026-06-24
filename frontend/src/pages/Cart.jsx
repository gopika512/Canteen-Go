import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';

const CAT_EMOJI = {
  Breakfast: '🌅', Lunch: '🍽️', Snacks: '🥪',
  Beverages: '☕', 'Main Course': '🍛',
};

/**
 * Cart Page
 *
 * Payment flow:
 *   1. Student reviews cart → clicks "Pay with Razorpay"
 *   2. Frontend calls POST /api/payments/create-order → gets razorpay_order_id
 *   3. Opens Razorpay Checkout modal (student enters card / UPI)
 *   4. On success → calls POST /api/payments/verify (HMAC check on backend)
 *   5. Backend verifies, creates order, returns token + pickup_qr_uuid
 *   6. Shows SUCCESS overlay with Pickup QR code + Token number
 *   7. If payment fails → shows error overlay
 */
function Cart() {
  const { cart, addToCart, removeFromCart, clearCart, cartTotal } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // 'idle' | 'loading' | 'razorpay_open' | 'verifying' | 'success' | 'failed'
  const [payStep, setPayStep] = useState('idle');
  const [orderResult, setOrderResult] = useState(null);   // {token, pickup_qr_uuid, payment_id, paid_amount}
  const [errorMsg, setErrorMsg] = useState('');

  // ── Empty cart guard ──
  if (cart.length === 0 && payStep !== 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fadeIn">
        <div className="text-7xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Add some items from the menu first</p>
        <Link to="/menu" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
          Browse Menu
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main payment handler
  // ─────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    setErrorMsg('');

    // Guard: check Razorpay script is loaded
    if (typeof window.Razorpay === 'undefined') {
      setErrorMsg('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

    setPayStep('loading');

    try {
      // Step 1: Create Razorpay order on backend
      const orderRes = await api.post('/payments/create-order', {
        amount: cartTotal,
      });
      const { razorpay_order_id, amount, currency, key_id } = orderRes.data;

      setPayStep('razorpay_open');

      // Step 2: Open Razorpay Checkout modal
      const options = {
        key:         key_id,
        amount:      amount,
        currency:    currency,
        name:        'Smart Canteen 🍽️',
        description: `Order for ${user?.name || user?.email || 'Student'}`,
        order_id:    razorpay_order_id,
        theme:       { color: '#f97316' },  // Orange to match our brand
        prefill: {
          email: user?.email || '',
          name:  user?.name  || '',
        },
        // ── Called when payment is successful ──
        handler: async (response) => {
          setPayStep('verifying');
          try {
            // Step 3: Verify payment signature on backend
            const verifyRes = await api.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
              student_name:        user?.name || user?.email || 'Student',
              cart_items:          cart.map(c => ({
                item_name: c.item_name,
                quantity:  c.quantity,
                price:     c.price,
              })),
              total_amount: cartTotal,
            });

            // Step 4: Payment verified — show success
            setOrderResult(verifyRes.data);
            setPayStep('success');
            clearCart();

            // Store UUID in localStorage so TokenStatus page can read it
            localStorage.setItem(
              `canteen_qr_${verifyRes.data.token}`,
              verifyRes.data.pickup_qr_uuid
            );
          } catch (err) {
            setErrorMsg(
              err.response?.data?.detail ||
              'Payment verification failed. Please contact the canteen.'
            );
            setPayStep('failed');
          }
        },
        modal: {
          // Called when student closes modal without paying
          ondismiss: () => {
            setPayStep('idle');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      // ── Called when payment explicitly fails ──
      rzp.on('payment.failed', (response) => {
        setErrorMsg(
          `Payment failed: ${response.error.description}. Code: ${response.error.code}`
        );
        setPayStep('failed');
      });

      rzp.open();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail ||
        'Failed to start payment. Please try again.'
      );
      setPayStep('failed');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS overlay — shown after payment + verification
  // ─────────────────────────────────────────────────────────────
  if (payStep === 'success' && orderResult) {
    return (
      <div className="max-w-sm mx-auto animate-fadeIn">

        {/* Green success header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-8 text-center text-white mb-5">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-black mb-1">Payment Successful!</h1>
          <p className="text-green-100 text-sm">Your order is confirmed</p>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <div className="text-3xl font-black text-orange-500">#{orderResult.token}</div>
              <div className="text-xs text-gray-400 mt-0.5">Token Number</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-2xl font-black text-green-600">₹{orderResult.paid_amount}</div>
              <div className="text-xs text-gray-400 mt-0.5">Amount Paid</div>
            </div>
          </div>

          {/* Payment ID */}
          <div className="mt-3 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Payment ID</p>
            <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">{orderResult.payment_id}</p>
          </div>

          {/* Payment status badge */}
          <div className="mt-2 flex justify-center">
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
              💳 {orderResult.payment_status}
            </span>
          </div>
        </div>

        {/* Pickup QR */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mb-4">
          <h3 className="font-semibold text-gray-800 mb-1">📲 Your Pickup QR</h3>
          <p className="text-xs text-gray-400 mb-4">Show this QR to the canteen staff when collecting your order</p>
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white border-2 border-orange-100 rounded-2xl shadow-sm">
              <QRCodeCanvas
                value={orderResult.pickup_qr_uuid}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            One-time use · Valid until collected · Token #{orderResult.token}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            to="/menu"
            className="flex-1 text-center border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Order More
          </Link>
          <button
            onClick={() => navigate(`/token/${orderResult.token}`)}
            className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Track Token #{orderResult.token} →
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // FAILED overlay
  // ─────────────────────────────────────────────────────────────
  if (payStep === 'failed') {
    return (
      <div className="max-w-sm mx-auto text-center animate-fadeIn">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-4">
          <div className="text-5xl mb-3">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Failed</h2>
          <p className="text-gray-500 text-sm mb-4">{errorMsg || 'Something went wrong. Your cart is safe.'}</p>
          <p className="text-xs text-gray-400">No amount was deducted.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/menu" className="flex-1 text-center border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Back to Menu
          </Link>
          <button
            onClick={() => { setPayStep('idle'); setErrorMsg(''); }}
            className="flex-[2] bg-orange-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main cart view
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🛒 Your Cart</h1>

      {/* Cart items */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-4 divide-y divide-gray-50">
        {cart.map(item => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <span className="text-2xl">{CAT_EMOJI[item.category] || '🍴'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{item.item_name}</p>
              <p className="text-orange-500 font-semibold text-sm">₹{item.price} each</p>
            </div>
            {/* Qty controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => removeFromCart(item.id)}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold flex items-center justify-center text-lg transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center font-bold text-gray-800 text-sm">{item.quantity}</span>
              <button
                onClick={() => addToCart(item)}
                className="w-8 h-8 rounded-lg bg-orange-500 text-white hover:bg-orange-600 font-bold flex items-center justify-center text-lg transition-colors"
              >
                +
              </button>
            </div>
            <div className="text-right w-16">
              <p className="font-bold text-gray-800">₹{item.price * item.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span>₹{cartTotal}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Service charge</span>
            <span className="text-green-500 font-medium">FREE</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="text-orange-500 text-lg">₹{cartTotal}</span>
          </div>
        </div>
      </div>

      {/* Razorpay info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex items-start gap-2">
        <span className="text-lg flex-shrink-0">🔒</span>
        <div className="text-xs text-blue-700">
          <p className="font-semibold">Secure payment via Razorpay</p>
          <p className="text-blue-500 mt-0.5">Your token and pickup QR are generated only after payment is confirmed.</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Link
          to="/menu"
          className="flex-1 text-center border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          ← Add More
        </Link>
        <button
          onClick={handlePayment}
          disabled={payStep === 'loading' || payStep === 'verifying'}
          className="flex-[2] bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-3 px-6 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {payStep === 'loading' && <>⏳ Opening Payment…</>}
          {payStep === 'verifying' && <>⏳ Verifying Payment…</>}
          {(payStep === 'idle' || payStep === 'razorpay_open') && <>💳 Pay ₹{cartTotal} with Razorpay</>}
        </button>
      </div>

      {/* Test mode hint */}
      <p className="text-center text-xs text-gray-400 mt-3">
        🧪 Test card: <span className="font-mono">4111 1111 1111 1111</span> · Any expiry · Any CVV
      </p>
    </div>
  );
}

export default Cart;