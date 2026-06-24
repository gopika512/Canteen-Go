import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_BADGE = {
  pending:   'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready:     'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
};

function OrderHistory() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/orders/history')
      .then(res => setOrders(res.data))
      .catch(err => {
        console.error(err);
        setError('Could not load your order history. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fadeIn">
        <div className="text-7xl mb-4">📋</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
        <p className="text-gray-400 text-sm mb-6">Your order history will appear here once you place an order</p>
        <Link to="/menu" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
          Order Now
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 My Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{orders.length} orders total</p>
        </div>
        <Link to="/menu" className="text-sm bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          + New Order
        </Link>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow animate-slideUp">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-black text-orange-500">#{order.token_number}</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-500'}`}>
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : '—'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Date unavailable'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-gray-800">₹{order.total_amount}</p>
                <p className="text-xs text-gray-400">{order.items?.length || 0} item(s)</p>
              </div>
            </div>

            {/* Items list */}
            <div className="border-t border-gray-50 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {order.items?.map((item, i) => (
                  <span key={i} className="bg-gray-50 text-gray-600 text-xs px-2.5 py-1 rounded-lg border border-gray-100">
                    {item.quantity}× {item.item_name}
                  </span>
                ))}
              </div>
            </div>

            {/* Track link for active orders */}
            {order.status !== 'completed' && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <Link
                  to={`/token/${order.token_number}`}
                  className="text-xs text-orange-500 font-semibold hover:text-orange-600"
                >
                  📍 Track this order →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderHistory;
