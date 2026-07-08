import { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import logoImg from '../assets/logo.png';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`text-sm font-medium transition-colors ${
        isActive(to) ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-orange-500 font-extrabold text-xl">
            <img src={logoImg} alt="Smart Canteen Logo" className="w-8 h-8 rounded-full object-cover shadow-sm" /> <span>Smart Canteen</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {navLink('/', '🏠 Home')}
            {user && navLink('/menu', '🍽️ Menu')}
            {user && user.role !== 'admin' && navLink('/orders', '📋 My Orders')}
            {user?.role === 'admin' && navLink('/admin', '⚙️ Admin')}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {/* Cart icon with badge (students only) */}
            {user && user.role !== 'admin' && (
              <Link to="/cart" className="relative p-2 text-gray-500 hover:text-orange-500 transition-colors text-xl">
                🛒
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  👤 <span className="font-semibold text-gray-800">{user.name}</span>
                  {user.role === 'admin' && (
                    <span className="ml-1.5 bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                      Admin
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"    className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Login</Link>
                <Link to="/register" className="text-sm bg-orange-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors">Register</Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-gray-600 p-2 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 animate-fadeIn">
            <MobileLink to="/" label="🏠 Home" close={() => setMobileOpen(false)} active={isActive('/')} />
            {user && <MobileLink to="/menu" label="🍽️ Menu" close={() => setMobileOpen(false)} active={isActive('/menu')} />}
            {user && user.role !== 'admin' && (
              <>
                <MobileLink to="/cart"   label={`🛒 Cart${cartCount > 0 ? ` (${cartCount})` : ''}`} close={() => setMobileOpen(false)} active={isActive('/cart')} />
                <MobileLink to="/orders" label="📋 My Orders" close={() => setMobileOpen(false)} active={isActive('/orders')} />
              </>
            )}
            {user?.role === 'admin' && <MobileLink to="/admin" label="⚙️ Admin" close={() => setMobileOpen(false)} active={isActive('/admin')} />}
            <div className="pt-2 border-t border-gray-100">
              {user ? (
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors">
                  🚪 Logout ({user.name})
                </button>
              ) : (
                <>
                  <MobileLink to="/login"    label="🔐 Login"    close={() => setMobileOpen(false)} active={isActive('/login')} />
                  <MobileLink to="/register" label="📝 Register" close={() => setMobileOpen(false)} active={isActive('/register')} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function MobileLink({ to, label, close, active }) {
  return (
    <Link
      to={to}
      onClick={close}
      className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );
}

export default Navbar;