import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import { ITEM_IMAGES } from '../menu_images';

// Map category name → emoji (used for category filter pills)
const CAT_EMOJI = {
  Breakfast:     '🌅',
  Lunch:         '🍽️',
  Snacks:        '🥪',
  Beverages:     '☕',
  'Main Course': '🍛',
  All:           '🍴',
};

// Category → food image from Unsplash CDN (free, no API key needed)
// These are stable photo IDs — will not break over time
const CATEGORY_IMAGES = {
  Breakfast:     'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  Lunch:         'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  Snacks:        'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
  Beverages:     'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'Main Course': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  DEFAULT:       'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
};

/**
 * Returns the best image URL for a menu item:
 *   1. item.image (if the DB has a custom image stored)
 *   2. ITEM_IMAGES[item.item_name] (exact mapped food photo)
 *   3. CATEGORY_IMAGES[item.category] (category fallback)
 *   4. CATEGORY_IMAGES.DEFAULT (generic food image, always works)
 */
const getImage = (item) =>
  item.image || ITEM_IMAGES[item.item_name] || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES.DEFAULT;

function Menu() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');

  const { cart, addToCart, removeFromCart, cartCount, cartTotal } = useContext(SocketContext);

  useEffect(() => {
    api.get('/menu/')
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Unique categories from API response
  const categories = ['All', ...new Set(items.map(i => i.category))];

  // Filter by search text and active category
  const filtered = items.filter(item => {
    const matchSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'All' || item.category === category;
    return matchSearch && matchCat;
  });

  // How many of this item is in cart
  const cartQty = (id) => cart.find(c => c.id === id)?.quantity || 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
            {/* Image placeholder */}
            <div className="h-40 bg-gray-100" />
            <div className="p-5">
              <div className="h-5 bg-gray-100 rounded mb-2 w-3/4" />
              <div className="h-3 bg-gray-100 rounded mb-4 w-1/2" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🍽️ Today's Menu</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.filter(i => i.is_available).length} of {items.length} items available</p>
        </div>
        {cartCount > 0 && (
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            🛒 View Cart ({cartCount})&nbsp;·&nbsp;₹{cartTotal}
          </Link>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
        />
      </div>

      {/* ── Category pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              category === cat
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500'
            }`}
          >
            {CAT_EMOJI[cat] || '🍴'} {cat}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-medium">No items match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const qty = cartQty(item.id);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border border-gray-100 flex flex-col hover:shadow-md transition-shadow animate-slideUp overflow-hidden ${!item.is_available ? 'opacity-60' : ''}`}
              >
                {/* ── Food image ── */}
                <div className="relative">
                  <img
                    src={getImage(item)}
                    alt={item.item_name}
                    style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                    onError={(e) => {
                      // Prevent broken image icon — fall back to generic food photo
                      e.target.onerror = null;
                      e.target.src = CATEGORY_IMAGES.DEFAULT;
                    }}
                  />
                  {/* Availability badge overlaid on image */}
                  <span
                    className={`absolute top-2 right-2 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm ${
                      item.is_available
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.is_available ? '✓ Available' : '✕ Out of Stock'}
                  </span>
                </div>

                {/* ── Card body ── */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Item info */}
                  <h3 className="font-semibold text-gray-800 mb-0.5">{item.item_name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{item.category} &nbsp;·&nbsp; ⏱ {item.preparation_time} min</p>
                  <p className="text-xl font-black text-orange-500 mb-4">₹{item.price}</p>

                  {/* Cart controls */}
                  {!item.is_available ? (
                    <div className="mt-auto text-center text-xs text-gray-400 bg-gray-50 py-2.5 rounded-xl">
                      Currently unavailable
                    </div>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart({ id: item.id, item_name: item.item_name, price: item.price, category: item.category })}
                      className="mt-auto w-full border-2 border-orange-200 text-orange-500 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                    >
                      + Add to Cart
                    </button>
                  ) : (
                    <div className="mt-auto flex items-center justify-between bg-orange-500 rounded-xl px-3 py-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-white font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        −
                      </button>
                      <span className="text-white font-bold text-sm">{qty} in cart</span>
                      <button
                        onClick={() => addToCart({ id: item.id, item_name: item.item_name, price: item.price, category: item.category })}
                        className="text-white font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>  {/* end card body */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Menu;