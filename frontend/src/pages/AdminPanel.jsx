import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../services/api';

const STATUS_BADGE = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  preparing: 'bg-blue-100   text-blue-700   border-blue-200',
  ready:     'bg-green-100  text-green-700  border-green-200',
  completed: 'bg-gray-100   text-gray-500   border-gray-200',
};

const CAT_EMOJI = { Breakfast: '🌅', Lunch: '🍽️', Snacks: '🥪', Beverages: '☕', 'Main Course': '🍛' };

const BLANK_FORM = { item_name: '', price: '', category: 'Breakfast', is_available: true, preparation_time: 5 };

function AdminPanel() {
  const [tab, setTab]       = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menu,   setMenu]   = useState([]);
  const [stats,  setStats]  = useState(null);
  const [loading, setLoading] = useState(true);

  // Menu form state
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [form,        setForm]        = useState(BLANK_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ordersRes, menuRes, statsRes] = await Promise.all([
        api.get('/orders/active'),
        api.get('/menu/'),
        api.get('/orders/analytics'),
      ]);
      setOrders(ordersRes.data);
      setMenu(menuRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => api.get('/orders/active').then(r => setOrders(r.data)), 15000);
    return () => clearInterval(timer);
  }, []);

  // ── Order actions ──
  const updateStatus = async (tokenNum, newStatus) => {
    await api.put(`/orders/${tokenNum}/status?status=${newStatus}`);
    const res = await api.get('/orders/active');
    setOrders(res.data);
    const statsRes = await api.get('/orders/analytics');
    setStats(statsRes.data);
  };

  // ── QR Verification section state ──
  const [qrInput,      setQrInput]      = useState('');   // UUID typed / pasted by admin
  const [verifyResult, setVerifyResult] = useState(null); // {ok: bool, message, order?}
  const [verifying,    setVerifying]    = useState(false);
  const [isScanning,   setIsScanning]   = useState(false);

  const handleDirectScan = async (scannedUuid) => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post(`/orders/verify-qr?pickup_qr_uuid=${encodeURIComponent(scannedUuid.trim())}`);
      setVerifyResult({ ok: true, data: res.data });
      const updated = await api.get('/orders/active');
      setOrders(updated.data);
      const statsRes = await api.get('/orders/analytics');
      setStats(statsRes.data);
      setQrInput('');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Verification failed';
      setVerifyResult({ ok: false, message: detail });
    } finally {
      setVerifying(false);
    }
  };

  const verifyQr = async () => {
    if (!qrInput.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post(`/orders/verify-qr?pickup_qr_uuid=${encodeURIComponent(qrInput.trim())}`);
      setVerifyResult({ ok: true, data: res.data });
      // Refresh orders list — verified order is now completed
      const updated = await api.get('/orders/active');
      setOrders(updated.data);
      const statsRes = await api.get('/orders/analytics');
      setStats(statsRes.data);
      setQrInput('');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Verification failed';
      setVerifyResult({ ok: false, message: detail });
    } finally {
      setVerifying(false);
    }
  };


  // ── Menu actions ──
  const openAdd  = () => { setEditItem(null); setForm(BLANK_FORM); setShowForm(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ item_name: item.item_name, price: item.price, category: item.category, is_available: item.is_available, preparation_time: item.preparation_time });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const payload = { ...form, price: parseFloat(form.price), preparation_time: parseInt(form.preparation_time, 10) };
    try {
      if (editItem) {
        await api.put(`/menu/${editItem.id}`, payload);
      } else {
        await api.post('/menu/', payload);
      }
      const menuRes = await api.get('/menu/');
      setMenu(menuRes.data);
      closeForm();
    } catch (err) {
      alert('Failed to save item. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    await api.delete(`/menu/${id}`);
    setMenu(prev => prev.filter(i => i.id !== id));
  };

  const toggleAvail = async (id, current) => {
    await api.put(`/menu/${id}/availability?is_available=${!current}`);
    setMenu(prev => prev.map(i => i.id === id ? { ...i, is_available: !current } : i));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />)}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage orders, menu items, and analytics</p>
        </div>
        <button onClick={loadAll} className="text-sm border border-gray-200 text-gray-500 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* ── Quick stat strip ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Orders',   value: stats.total_orders,      icon: '📋', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
            { label: 'Total Revenue',  value: `₹${stats.total_revenue}`, icon: '💰', color: 'text-green-600',  bg: 'bg-green-50 border-green-100' },
            { label: 'Avg Order',      value: `₹${stats.avg_order_value}`, icon: '📈', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border rounded-2xl p-4`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { id: 'orders',    label: '📋 Orders',    count: orders.length },
          { id: 'menu',      label: '🍽️ Menu',      count: menu.length   },
          { id: 'analytics', label: '📊 Analytics'                       },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════ ORDERS TAB ════════════════ */}
      {tab === 'orders' && (
        <div>

          {/* ── QR Verification section ── */}
          <div className="bg-white rounded-2xl border border-indigo-100 p-5 mb-5">
            <h3 className="font-semibold text-gray-800 mb-1">🔍 Verify Pickup QR</h3>
            <p className="text-xs text-gray-400 mb-3">
              Scan or paste the student&apos;s Pickup QR UUID to mark order as collected.
              USB QR scanners type the UUID into the field automatically.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrInput}
                onChange={e => { setQrInput(e.target.value); setVerifyResult(null); }}
                onKeyDown={e => e.key === 'Enter' && verifyQr()}
                placeholder="Paste or scan UUID here…"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 font-mono"
              />
              <button
                onClick={verifyQr}
                disabled={!qrInput.trim() || verifying}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
              >
                {verifying ? '⏳…' : '✓ Verify'}
              </button>
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={`${isScanning ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0`}
              >
                {isScanning ? 'Cancel Scan' : '📷 Camera'}
              </button>
            </div>

            {/* Scanner Container */}
            {isScanning && (
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                <div className="w-full max-w-sm mx-auto">
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        setIsScanning(false);
                        const text = result[0].rawValue;
                        setQrInput(text);
                        handleDirectScan(text);
                      }
                    }}
                    onError={(error) => console.error(error)}
                  />
                </div>
              </div>
            )}

            {/* Verification result */}
            {verifyResult && (
              <div className={`mt-3 rounded-xl p-3 text-sm animate-slideUp ${
                verifyResult.ok
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {verifyResult.ok ? (
                  <div>
                    <p className="font-semibold text-green-700 mb-1">✅ Order Verified Successfully</p>
                    <div className="text-xs text-green-600 space-y-0.5">
                      <p>Token: <strong>#{verifyResult.data.token_number}</strong></p>
                      <p>Student: <strong>{verifyResult.data.student_name}</strong></p>
                      <p>Amount: <strong>₹{verifyResult.data.total_amount}</strong></p>
                      {verifyResult.data.payment_id && (
                        <p>Payment ID: <span className="font-mono">{verifyResult.data.payment_id.slice(0, 20)}…</span></p>
                      )}
                      <p>Verified by: <strong>{verifyResult.data.verified_by}</strong></p>
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-red-600">
                    {verifyResult.message === 'QR Already Used' || verifyResult.message?.includes('already')
                      ? '❌ QR Already Used — This order has already been collected.'
                      : `❌ ${verifyResult.message}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-gray-500 font-medium">No active orders right now</p>
              <p className="text-gray-400 text-sm mt-1">New orders will appear here automatically</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => (
                <div key={order.id} className={`bg-white rounded-2xl border-2 p-5 ${
                  order.status === 'pending'   ? 'border-yellow-200' :
                  order.status === 'preparing' ? 'border-blue-200'   :
                  order.status === 'ready'     ? 'border-green-300'  : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-gray-800">#{order.token_number}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">{order.student_name}</p>
                  <div className="text-xs text-gray-400 space-y-0.5 mb-3">
                    {order.items?.map((item, i) => <div key={i}>{item.quantity}× {item.item_name}</div>)}
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">{order.items?.length} item(s)</span>
                    <span className="font-bold text-orange-500">₹{order.total_amount}</span>
                  </div>

                  {/* Payment details row */}
                  {order.payment_status && (
                    <div className="bg-gray-50 rounded-xl p-2.5 mb-3 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Payment</span>
                        <span className={`font-bold ${
                          order.payment_status === 'PAID' ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {order.payment_status === 'PAID' ? '💳 PAID' : '❌ FAILED'}
                        </span>
                      </div>
                      {order.payment_id && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payment ID</span>
                          <span className="font-mono text-gray-500 text-[10px]">{order.payment_id.slice(0, 14)}…</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── QR Code section ── */}
                  <div className="border-t border-gray-50 pt-4 mt-3 text-center">
                    <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Pickup QR Code</p>
                    <div className="flex justify-center mb-2">
                      <div className={`p-2 rounded-xl inline-block ${
                        order.qr_used ? 'opacity-40 grayscale' : 'bg-white border border-gray-100 shadow-sm'
                      }`}>
                        <QRCodeCanvas
                          value={order.pickup_qr_uuid || `LEGACY-TOKEN-${order.token_number}`}
                          size={96}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                    {order.qr_used ? (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[11px] font-semibold px-3 py-1 rounded-full">
                        ✕ QR Already Used
                      </span>
                    ) : (
                      <p className="text-[10px] text-gray-400">Student shows this QR at counter</p>
                    )}
                  </div>

                  {/* ── Status action buttons ── */}
                  <div className="mt-3">
                  {order.status === 'pending' && (
                    <button onClick={() => updateStatus(order.token_number, 'preparing')} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
                      👨‍🍳 Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateStatus(order.token_number, 'ready')} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
                      ✅ Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateStatus(order.token_number, 'completed')} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
                      🙌 Mark Collected
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <p className="text-center text-gray-400 text-sm py-1">✓ Completed</p>
                  )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ MENU TAB ════════════════ */}
      {tab === 'menu' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              + Add Item
            </button>
          </div>

          {/* Add/Edit form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 animate-slideUp">
              <h3 className="font-bold text-gray-900 mb-4">{editItem ? '✏️ Edit Item' : '➕ Add New Item'}</h3>
              <form onSubmit={handleMenuSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Item Name *</label>
                  <input required value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})}
                    placeholder="e.g. Masala Dosa"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Price (₹) *</label>
                  <input required type="number" min="1" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    placeholder="50"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                    {['Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Main Course'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Prep Time (min)</label>
                  <input type="number" min="1" value={form.preparation_time} onChange={e => setForm({...form, preparation_time: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2.5">
                  <input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm({...form, is_available: e.target.checked})}
                    className="w-4 h-4 accent-orange-500 rounded" />
                  <label htmlFor="avail" className="text-sm text-gray-700 font-medium">Available for ordering</label>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="button" onClick={closeForm}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={formLoading}
                    className="flex-[2] bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    {formLoading ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Menu list */}
          <div className="space-y-3">
            {menu.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <span className="text-2xl flex-shrink-0">{CAT_EMOJI[item.category] || '🍴'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{item.item_name}</p>
                  <p className="text-xs text-gray-400">{item.category} · ₹{item.price} · ⏱ {item.preparation_time} min</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleAvail(item.id, item.is_available)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                      item.is_available
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-red-100 text-red-500 hover:bg-red-200'
                    }`}>
                    {item.is_available ? '✓ In Stock' : '✕ Out'}
                  </button>
                  <button onClick={() => openEdit(item)}
                    className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    className="text-xs border border-red-100 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════ ANALYTICS TAB ════════════════ */}
      {tab === 'analytics' && stats && (
        <div className="animate-slideUp space-y-5">

          {/* Status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Order Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats.status_breakdown).map(([status, count]) => (
                <div key={status} className={`text-center p-4 rounded-xl border ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  <div className="text-3xl font-black">{count}</div>
                  <div className="text-xs font-semibold capitalize mt-0.5">{status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Items */}
          {stats.top_items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">🏆 Top Selling Items</h3>
              <div className="space-y-4">
                {stats.top_items.map((item, i) => {
                  const pct = Math.round((item.count / stats.top_items[0].count) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300 w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-gray-700">{item.name}</span>
                          <span className="text-gray-400 text-xs">{item.count} sold</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue note */}
          {stats.total_orders === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-gray-500 font-medium">No orders yet</p>
              <p className="text-gray-400 text-sm mt-1">Analytics will appear once orders start coming in</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;