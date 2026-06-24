import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard    from './pages/Dashboard';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Menu         from './pages/Menu';
import Cart         from './pages/Cart';
import OrderHistory from './pages/OrderHistory';
import TokenStatus  from './pages/TokenStatus';
import AdminPanel   from './pages/AdminPanel';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-6">
              <Routes>
                {/* Public */}
                <Route path="/"         element={<Dashboard />} />
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Student (must be logged in) */}
                <Route path="/menu"            element={<ProtectedRoute><Menu /></ProtectedRoute>} />
                <Route path="/cart"            element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/orders"          element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="/token/:tokenNumber" element={<ProtectedRoute><TokenStatus /></ProtectedRoute>} />

                {/* Admin only */}
                <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminPanel /></ProtectedRoute>} />
              </Routes>
            </main>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;