import React, { createContext, useContext, useState } from "react";
import { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSafeStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Corrupt user in localStorage cleared:", err);
    try { localStorage.removeItem("user"); } catch {}
    return null;
  }
}

function getSafeStoredToken(): string | null {
  try {
    const t = localStorage.getItem("token");
    if (!t || t === "undefined" || t === "null") return null;
    return t;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getSafeStoredToken);
  const [user, setUser] = useState<User | null>(getSafeStoredUser);

  const login = (newToken: string, newUser: User) => {
    try {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (e) {
      console.warn("Could not write to localStorage:", e);
    }
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem("user", JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not write to localStorage:", e);
      }
      return updated;
    });
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
