"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  clearStoredAuth,
  getStoredActiveDepartmentId,
  getStoredAuth,
  getStoredToken,
  setStoredActiveDepartmentId,
  setStoredAuth,
  isSessionExpired,
  touchSessionActivity,
} from "@/types/auth";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setActiveDepartment: (departmentId: number | null) => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const forceLogoutAndRedirect = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
    setIsLoading(false);
    router.replace("/signin");
  }, [router]);

  const fetchMe = useCallback(async (departmentId?: number | null) => {
    const t = getStoredToken();
    if (!t) return null;
    const headers: Record<string, string> = { Authorization: `Bearer ${t}` };
    const dept =
      departmentId !== undefined
        ? departmentId
        : getStoredActiveDepartmentId();
    if (dept) headers["X-Department-Id"] = String(dept);
    const res = await fetch("/api/auth/me", { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as AuthUser;
  }, []);

  const refreshUser = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }
    try {
      const nextUser = await fetchMe();
      if (nextUser) {
        const auth = { user: nextUser, token: t };
        setStoredAuth(auth, { preserveLastActivityAt: true });
        setUser(nextUser);
        setToken(t);
      } else {
        clearStoredAuth();
        setUser(null);
        setToken(null);
      }
    } catch {
      clearStoredAuth();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.user && stored?.token) {
      if (isSessionExpired()) {
        forceLogoutAndRedirect();
        return;
      }
      setUser(stored.user);
      setToken(stored.token);
      // Let protected routes and sign-in redirect run immediately; validate token in the background.
      setIsLoading(false);
      void refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser, forceLogoutAndRedirect]);

  // Session expiry: logout after 1 hour of inactivity (clicks, keys, scroll, API calls)
  useEffect(() => {
    const check = () => {
      if (getStoredToken() && isSessionExpired()) {
        forceLogoutAndRedirect();
      }
    };
    const interval = setInterval(check, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [forceLogoutAndRedirect]);

  useEffect(() => {
    if (!token) return;

    const onActivity = () => touchSessionActivity();
    const events = ["click", "keydown", "mousedown", "touchstart", "scroll"] as const;

    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [token]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || "Login failed" };
        }
        setStoredAuth({ user: data.user, token: data.token, lastActivityAt: Date.now() });
        if (!data.user.isSuperAdmin && data.user.departmentAssignments?.length > 0) {
          const active =
            data.user.activeDepartmentId ??
            data.user.departmentAssignments[0]?.departmentId ??
            null;
          if (active) setStoredActiveDepartmentId(active);
        }
        setUser(data.user);
        setToken(data.token);
        setIsLoading(false);
        return {};
      } catch (e) {
        return { error: "Network error" };
      }
    },
    []
  );

  const setActiveDepartment = useCallback(
    async (departmentId: number | null) => {
      setStoredActiveDepartmentId(departmentId);
      const nextUser = await fetchMe(departmentId);
      if (!nextUser) return;
      const t = getStoredToken();
      if (!t) return;
      setStoredAuth({ user: nextUser, token: t }, { preserveLastActivityAt: true });
      setUser(nextUser);
    },
    [fetchMe]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user?.permissions) return false;
      if (user.isSuperAdmin) return true;
      if (user.permissions.includes("admin") || user.permissions.includes("*"))
        return true;
      return user.permissions.includes(permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        setActiveDepartment,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
