"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginUser,
  loginWithGoogle,
  registerUser,
  verifyEmail as verifyEmailRequest,
} from "@/lib/api";
import type { User } from "@/types";

const TOKEN_KEY = "tp_token";
const USER_KEY = "tp_user";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reading localStorage (a browser-only external store) on mount, not
    // derivable from props/state — a lazy useState initializer would read
    // it during SSR too and mismatch the server-rendered markup.
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const persist = (nextUser: User, nextToken: string) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
  };

  const login = async (email: string, password: string) => {
    const result = await loginUser(email, password);
    persist(result.user, result.token);
  };

  const loginGoogle = async (idToken: string) => {
    const result = await loginWithGoogle(idToken);
    persist(result.user, result.token);
  };

  const register = async (name: string, email: string, password: string) => {
    // No token/user comes back here — the account isn't usable until the
    // user clicks the verification link emailed by the server.
    await registerUser(name, email, password);
  };

  const verifyEmail = async (verificationToken: string) => {
    const result = await verifyEmailRequest(verificationToken);
    persist(result.user, result.token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginGoogle,
        register,
        verifyEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
