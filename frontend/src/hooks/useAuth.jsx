import { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/auth/me"), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      if (!res.ok) throw new Error(data.detail || "Login failed");
      await fetchUser();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await fetch(apiUrl("/api/v1/auth/logout"), {
        method: "POST",
        credentials: "include" 
      });
    } catch (error) {
      console.error(error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, fetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
