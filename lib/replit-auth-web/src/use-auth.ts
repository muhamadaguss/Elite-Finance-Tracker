import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (data: { username: string; password: string; firstName?: string; lastName?: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || "Login gagal" };
      }

      setUser(data.user);
      return {};
    } catch {
      return { error: "Koneksi gagal, coba lagi" };
    }
  }, []);

  const register = useCallback(async (data: { username: string; password: string; firstName?: string; lastName?: string }): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return { error: result.error || "Registrasi gagal" };
      }

      setUser(result.user);
      return {};
    } catch {
      return { error: "Koneksi gagal, coba lagi" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}
