import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import TokenCard from '../components/TokenCard';

function Dashboard() {
  const { liveOrders, setLiveOrders } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/active');
      setLiveOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch live orders', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + auto-refresh every 15 seconds
  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-fadeIn">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl p-8 mb-8 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black mb-1">🍽️ Smart Canteen</h1>
            <p className="text-orange-100 text-sm">Order online · Get a token · Skip the queue</p>
          </div>
          {!user ? (
            <div className="flex gap-2">
              <Link to="/register" className="bg-white text-orange-500 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-50 transition-colors">
                Get Started
              </Link>
              <Link to="/login" className="border border-white/40 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition-colors">
                Sign In
              </Link>
            </div>
          ) : (
            <Link to="/menu" className="bg-white text-orange-500 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-50 transition-colors">
              Browse Menu →
            </Link>
          )}
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { val: liveOrders.length, label: 'Active Orders' },
            { val: liveOrders.filter(o => o.status === 'ready').length, label: 'Ready Now' },
            { val: liveOrders.filter(o => o.status === 'preparing').length, label: 'Preparing' },
          ].map((s, i) => (
            <div key={i} className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-2xl font-black">{s.val}</div>
              <div className="text-[11px] text-orange-100 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live Token Board ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">📺 Live Token Board</h2>
        <button
          onClick={fetchOrders}
          className="text-xs text-orange-500 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : liveOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="font-semibold text-gray-700 mb-1">All caught up!</h3>
          <p className="text-gray-400 text-sm">No active orders right now. Be the first!</p>
          {user && (
            <Link to="/menu" className="inline-block mt-5 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
              Order Now
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {liveOrders.map(order => (
            <TokenCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* ── How it works ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
        {[
          { icon: '🛒', title: 'Browse & Order', desc: 'Pick items from the menu and add to your cart' },
          { icon: '🎫', title: 'Get Your Token', desc: 'Receive a unique token number instantly' },
          { icon: '✅', title: 'Collect When Ready', desc: 'Wait anywhere — come when your token is ready' },
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;