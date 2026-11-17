"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";
import type { Me } from "./types";

interface AuthCtx {
  me: Me | undefined;
  ready: boolean;
  authed: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setToken(tokenStore.get());
    setHydrated(true);
  }, []);

  const meQuery = useQuery({ queryKey: ["me", token], queryFn: () => api<Me>("/me"), enabled: !!token });

  const accept = useCallback(
    (t: string) => {
      tokenStore.set(t);
      qc.clear();
      setToken(t);
    },
    [qc],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<{ access_token: string }>("/auth/login", { method: "POST", json: { email, password } });
      accept(r.access_token);
    },
    [accept],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const r = await api<{ access_token: string }>("/auth/register", { method: "POST", json: { email, password } });
      accept(r.access_token);
    },
    [accept],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    qc.clear();
    router.replace("/login");
  }, [qc, router]);

  const ready = hydrated && (!token || !meQuery.isPending || meQuery.isError);

  return (
    <Ctx.Provider value={{ me: meQuery.data, ready, authed: !!token && !!meQuery.data, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
