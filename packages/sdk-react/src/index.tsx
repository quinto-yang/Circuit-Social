import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { BindWalletInput, CxSessionPayload, LoginInput } from "@cx/sdk-js";
import { CxIdentityClient } from "@cx/sdk-js";

type CxAuthContextValue = {
  client: CxIdentityClient;
  session: CxSessionPayload | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (input: LoginInput) => Promise<CxSessionPayload>;
  logout: () => Promise<void>;
  bindWallet: (input: BindWalletInput) => Promise<CxSessionPayload>;
};

const CxAuthContext = createContext<CxAuthContextValue | null>(null);

export function CxAuthProvider({
  client,
  children,
  autoInit = true
}: {
  client: CxIdentityClient;
  children: React.ReactNode;
  autoInit?: boolean;
}) {
  const [session, setSession] = useState<CxSessionPayload | null>(null);
  const [loading, setLoading] = useState(autoInit);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await client.getSession();
      setSession(next);
    } finally {
      setLoading(false);
    }
  }, [client]);

  const login = useCallback(
    async (input: LoginInput) => {
      setLoading(true);
      try {
        const next = await client.login(input);
        setSession(next);
        return next;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await client.logout();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  const bindWallet = useCallback(
    async (input: BindWalletInput) => {
      setLoading(true);
      try {
        const next = await client.bindWallet(input);
        setSession(next);
        return next;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  useEffect(() => {
    if (!autoInit) return;
    void refresh();
  }, [autoInit, refresh]);

  const value = useMemo<CxAuthContextValue>(
    () => ({
      client,
      session,
      loading,
      refresh,
      login,
      logout,
      bindWallet
    }),
    [client, session, loading, refresh, login, logout, bindWallet]
  );

  return <CxAuthContext.Provider value={value}>{children}</CxAuthContext.Provider>;
}

export function useCxAuth() {
  const context = useContext(CxAuthContext);
  if (!context) {
    throw new Error("useCxAuth must be used within CxAuthProvider");
  }
  return context;
}

export function useCxSession() {
  const { session, loading, refresh } = useCxAuth();
  return { session, loading, refresh };
}

