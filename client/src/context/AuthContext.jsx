import { createContext, useState, useContext, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Check localStorage on initial load
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;
    // Older sessions saved the JWT here; drop it, the httpOnly cookie is the only token store.
    const { token: _legacyToken, ...profile } = JSON.parse(savedUser);
    localStorage.setItem("user", JSON.stringify(profile));
    return profile;
  });

  // 🔥 NEW: Instantly apply theme to the HTML document when user changes
  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [user?.theme]);

  const login = (userData) => {
    const { token: _token, ...profile } = userData; // never persist a token
    localStorage.setItem("user", JSON.stringify(profile));
    setUser(profile); // This triggers the Navbar and ProtectedRoute to update!
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get("/users/me");
      // Support multiple response shapes (legacy and newer endpoints)
      if (response.data._id) {
        updateUser(response.data);
      } else if (response.data.success && response.data.user) {
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);