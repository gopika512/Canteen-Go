import { createContext, useState } from 'react';

// Shared context for live orders (admin/dashboard) and global cart (menu/cart pages).
// Cart state lives here so it persists when navigating between Menu and Cart pages.
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [liveOrders, setLiveOrders] = useState([]);
  const [cart, setCart] = useState([]);

  // Add item to cart. If already in cart, increment quantity.
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // Remove one unit of item. Remove entirely if quantity reaches 0.
  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.id !== itemId);
    });
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <SocketContext.Provider
      value={{
        liveOrders, setLiveOrders,
        cart, addToCart, removeFromCart, clearCart,
        cartCount, cartTotal,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};