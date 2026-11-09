import { createContext, useState, useContext, useEffect, type ReactNode } from "react";
import api from "../api/axios";
import type { User } from "../types";

/** Login responses may still carry a token from older API versions; it is never stored. */
type LoginPayload = User & { token?: string };

interface AuthContextValue {
  user: User | null;
  login: (userData: LoginPayload) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Check localStorage on initial load
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;
    // Older sessions saved the JWT here; drop it, the httpOnly cookie is the only token store.
    const { token: _legacyToken, ...profile } = JSON.parse(savedUser) as LoginPayload;
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

  const login = (userData: LoginPayload) => {
    const { token: _token, ...profile } = userData; // never persist a token
    localStorage.setItem("user", JSON.stringify(profile));
    setUser(profile); // This triggers the Navbar and ProtectedRoute to update!
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    const updatedUser = { ...user, ...userData } as User;
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get<User & { success?: boolean; user?: User }>("/users/me");
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

// eslint-disable-next-line react-refresh/only-export-components -- hook intentionally lives beside its provider
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
