import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // On app load, check if user is already logged in from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('canteenUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Login: calls the real FastAPI backend
  // NOTE: FastAPI's OAuth2PasswordRequestForm requires form data with 'username' field (not 'email')
  const login = async (email, password) => {
    // Build form data — FastAPI login expects 'username' and 'password' as form fields
    const formData = new URLSearchParams();
    formData.append('username', email);   // FastAPI OAuth2 calls the field 'username'
    formData.append('password', password);

    const response = await api.post(
      '/auth/login',
      formData,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = response.data;

    // Decode the JWT payload to get email and role (no library needed — just base64 decode)
    const payload = JSON.parse(atob(access_token.split('.')[1]));

    const userData = {
      email: payload.sub,
      role: payload.role,
      name: payload.sub.split('@')[0],
      token: access_token,
    };

    // Save to state and localStorage so login persists on page refresh
    setUser(userData);
    localStorage.setItem('canteenUser', JSON.stringify(userData));

    return userData.role; // Returned so Login.jsx can redirect to the right page
  };

  // Logout: clear state and storage
  const logout = () => {
    setUser(null);
    localStorage.removeItem('canteenUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};