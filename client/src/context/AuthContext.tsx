import { createContext, useState, useContext, useEffect, type ReactNode } from "react";
import api from "../api/axios";
import type { AuthUser, User } from "../types/models";

interface AuthContextValue {
  user: AuthUser | null;
  login: (userData: AuthUser) => void;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const savedUser = localStorage.getItem("user");
    return savedUser ? (JSON.parse(savedUser) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Check localStorage on initial load
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  // 🔥 NEW: Instantly apply theme to the HTML document when user changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', user?.theme || 'light');
  }, [user?.theme]);

  const login = (userData: AuthUser) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData); // This triggers the Navbar and ProtectedRoute to update!
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (userData: Partial<AuthUser>) => {
    const updatedUser = { ...user, ...userData } as AuthUser;
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get<User | { success?: boolean; user?: User }>("/users/me");
      const data = response.data;
      // Support multiple response shapes (legacy and newer endpoints)
      if ("_id" in data && data._id) {
        updateUser(data);
      } else if ("user" in data && data.success && data.user) {
        updateUser(data.user);
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

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
};
