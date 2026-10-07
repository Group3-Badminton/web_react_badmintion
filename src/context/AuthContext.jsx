import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("bcms_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(
    () => localStorage.getItem("bcms_token") || null,
  );

  const handleLoginSuccess = (authData) => {
    const { user: userData, token: newToken } = authData;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("bcms_token", newToken);
    localStorage.setItem("bcms_user", JSON.stringify(userData));
  };
  const handleLogout = async () => {
    localStorage.removeItem("bcms_token");
    localStorage.removeItem("bcms_user");
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loginSuccess: handleLoginSuccess,
    logout: handleLogout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
