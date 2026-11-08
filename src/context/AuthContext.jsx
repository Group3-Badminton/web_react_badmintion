import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from '../utils/constants';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  //lấy thông tin khi chạy lại chương trình
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bcms_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bcms_token') || null);
  
  const [loading, setLoading] = useState(true);

  //xác thực phiên khi ngừi dùng f5
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('bcms_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/users/profile');
        if (res.data?.success && res.data?.data) {
          setUser(res.data.data);
          localStorage.setItem('bcms_user', JSON.stringify(res.data.data));
        }
      } catch (err) {
        // Nếu token hết hạn hoặc tài khoản bị xóa/khóa, dọn dẹp state
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('bcms_token');
          localStorage.removeItem('bcms_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const handleLoginSuccess = (authData) => {
    const { user: userData, token: newToken } = authData;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('bcms_token', newToken);
    localStorage.setItem('bcms_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    localStorage.removeItem('bcms_token');
    localStorage.removeItem('bcms_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === ROLES.ADMIN;
  const isStaff = user?.role === ROLES.STAFF;
  const isCustomer = user?.role === ROLES.CUSTOMER;

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === ROLES.ADMIN) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin,
    isStaff,
    isCustomer,
    hasRole,
    hasPermission,
    loginSuccess: handleLoginSuccess,
    logout: handleLogout,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
