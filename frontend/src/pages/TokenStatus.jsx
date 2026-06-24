import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../services/api';

const STEPS = ['pending', 'preparing', 'ready', 'completed'];

const STEP_INFO = {
  pending:   { label: 'Order Received',    icon: '✅', desc: 'Your order is queued at the counter',        color: 'text-yellow-500' },
  preparing: { label: 'Being Prepared',    icon: '👨‍🍳', desc: 'Chefs are working on your order right now', color: 'text-blue-500'   },
  ready:     { label: 'Ready for Pickup!', icon: '🎉', desc: 'Come to the counter and show your QR',      color: 'text-green-500'  },
  completed: { label: 'Collected',         icon: '🙌', desc: 'Enjoy your meal! Come back soon.',           color: 'text-gray-500'   },
};

function TokenStatus() {
  const { tokenNumber } = useParams();

  const [order, setOrder]   = useState(null);   // full order object from API
  const [loading, setLoading] = useState(true);

  // Pickup QR UUID: first try localStorage (set by Cart.jsx on success),
  // then fall back to the order object returned by the active orders API.
  const pickupUUID =
    localStorage.getItem(`canteen_qr_${tokenNumber}`) ||
    order?.pickup_qr_uuid ||
    '';

  const fetchOrder = async () => {
    try {
      const res = await api.get('/orders/active');
      const found = res.data.find(
        (o) => o.token_number === parseInt(tokenNumber, 10)
      );
      setOrder(found || { status: 'completed', token_number: parseInt(tokenNumber, 10) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount + auto-refresh every 10 seconds
  useEffect(() => {
    fetchOrder();
    const timer = setInterval(fetchOrder, 10000);
    return () => clearInterval(timer);
  }, [tokenNumber]);

  const status     = order?.status || 'pending';
  const currentIdx = STEPS.indexOf(status);
  const info       = STEP_INFO[status] || STEP_INFO.pending;

  return (
    <div className="max-w-sm mx-auto animate-fadeIn">

      {/* ── Token Hero ── */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl p-8 text-center text-white mb-5">
        <p className="text-orange-100 text-xs font-semibold uppercase tracking-widest mb-2">Your Token</p>
        <div className="text-8xl font-black leading-none mb-3">#{tokenNumber}</div>
        <div
          className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold ${
            status === 'ready' ? 'animate-pulse' : ''
          }`}
        >
          {info.icon} {info.label}
        </div>

        {/* Payment badge */}
        {order?.payment_status === 'PAID' && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 bg-green-400/30 border border-green-300/40 text-white text-[11px] font-semibold px-3 py-1 rounded-full">
              💳 PAID · ₹{order?.total_amount}
            </span>
          </div>
        )}
      </div>

      {/* ── Progress steps ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <h3 className="font-bold text-gray-800 mb-4">Order Progress</h3>
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const si     = STEP_INFO[step];
            const done   = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={step} className={`flex items-center gap-3 transition-opacity ${done ? 'opacity-100' : 'opacity-30'}`}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                    done ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                  } ${active ? 'ring-4 ring-orange-200' : ''}`}
                >
                  {done ? '✓' : idx + 1}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-orange-500' : 'text-gray-700'}`}>{si.label}</p>
                  {active && <p className="text-xs text-gray-400 mt-0.5">{si.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {status === 'ready' && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-center animate-pulse">
            <p className="text-green-700 font-semibold text-sm">🎉 Ready! Show the QR below at the counter.</p>
          </div>
        )}
      </div>

      {/* ── Pickup QR ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mb-4">
        <h3 className="font-semibold text-gray-800 mb-1">📲 Show at Counter</h3>
        <p className="text-xs text-gray-400 mb-4">The canteen staff will scan this to hand over your order</p>

        {loading ? (
          <div className="w-[180px] h-[180px] bg-gray-100 rounded-2xl animate-pulse mx-auto" />
        ) : pickupUUID ? (
          <div className="flex justify-center mb-3">
            <div className={`p-3 bg-white border-2 rounded-2xl shadow-sm transition-all ${
              status === 'completed' ? 'border-gray-200 opacity-50 grayscale' : 'border-orange-100'
            }`}>
              <QRCodeCanvas
                value={pickupUUID}   // UUID only — no sensitive data
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        ) : (
          // UUID not available yet (order placed before this feature)
          <div className="w-[180px] h-[180px] bg-gray-50 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
            <div className="text-center">
              <div className="text-4xl mb-2">🎫</div>
              <p className="text-xs text-gray-400">Token #{tokenNumber}</p>
            </div>
          </div>
        )}

        {status === 'completed' ? (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">
            ✓ Order Collected
          </span>
        ) : (
          <p className="text-[10px] text-gray-400">One-time use · Token #{tokenNumber}</p>
        )}
      </div>

      {/* ── Payment info (if available) ── */}
      {order?.payment_id && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-700 text-sm mb-2">Payment Details</h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="font-semibold text-green-600">💳 {order.payment_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="font-semibold text-gray-700">₹{order.total_amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment ID</span>
              <span className="font-mono text-gray-500 text-[10px]">{order.payment_id?.slice(0, 18)}…</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          onClick={fetchOrder}
          className="flex-1 border border-orange-200 text-orange-500 bg-orange-50 hover:bg-orange-100 py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          ↻ Refresh
        </button>
        <Link to="/menu" className="flex-1 text-center bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
          Order More
        </Link>
      </div>
    </div>
  );
}

export default TokenStatus;
