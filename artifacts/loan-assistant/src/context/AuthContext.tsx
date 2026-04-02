import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  kycCompleted: boolean;
  creditScore?: number | null;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("loan_token"));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const login = useCallback((newToken: string) => {
    localStorage.setItem("loan_token", newToken);
    setToken(newToken);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem("loan_token");
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    const stored = localStorage.getItem("loan_token");
    if (stored !== token) {
      setToken(stored);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user: (user as User) ?? null,
      token,
      isLoading: !!token && isLoading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
