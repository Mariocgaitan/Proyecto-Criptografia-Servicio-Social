import { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

const AuthContext = createContext();

// Pre-fetch nonce in parallel with /auth/me so it's ready when AuthWizard mounts
let _noncePrefetch = null;
export const prefetchNonce = () => {
  if (!_noncePrefetch) {
    _noncePrefetch = fetch(apiUrl("/api/v1/auth/google/nonce"), {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.nonce ?? null)
      .catch(() => null);
  }
  return _noncePrefetch;
};
export const clearNoncePrefetch = () => { _noncePrefetch = null; };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 6000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetchWithTimeout(apiUrl("/api/v1/auth/me"), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return data;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    prefetchNonce(); // Start nonce fetch in parallel with /auth/me
    fetchUser();
  }, []);

  const login = async (correo, password) => {
    try {
      const res = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Inicio de sesión fallido");
      const userData = await fetchUser();
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    fetch(apiUrl("/api/v1/auth/logout"), {
      method: "POST",
      credentials: "include"
    }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, fetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
