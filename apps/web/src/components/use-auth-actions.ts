import { startTransition, useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import { buildSiweMessage } from "@/lib/siwe";
import type { SessionUserPayload, TabKey, WalletAccount } from "@/lib/types";

type UseAuthActionsArgs = {
  connectors: any;
  connectAsync: any;
  signMessageAsync: (args: { message: string }) => Promise<string>;
  isConnected: boolean;
  selectedConnector: { id: string; name: string } | null;
  address: string | undefined;
  chain: { id: number } | null | undefined;
  loginChainType: "evm" | "solana";
  bindChainType: "evm" | "solana";
  enableSolanaLogin: boolean;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setSession: Dispatch<SetStateAction<SessionUserPayload | null | undefined>>;
  setTab: Dispatch<SetStateAction<TabKey>>;
  t: (zh: string, en: string) => string;
};

export function useAuthActions({
  connectors,
  connectAsync,
  signMessageAsync,
  isConnected,
  selectedConnector,
  address,
  chain,
  loginChainType,
  bindChainType,
  enableSolanaLogin,
  setBusy,
  setStatus,
  setSession,
  setTab,
  t
}: UseAuthActionsArgs) {
  const ensureConnector = useCallback(
    async (connectorId: string) => {
      const connector = connectors.find((item: any) => item.id === connectorId);
      if (!connector) return;
      try {
        await connectAsync({ connector });
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error("Wallet connect failed");
      }
    },
    [connectAsync, connectors]
  );

  const handleSiweLogin = useCallback(
    async (intent: "login" | "bind", options?: { chainType?: "evm" | "solana" }) => {
      const effectiveChainType = options?.chainType ?? (intent === "bind" ? bindChainType : loginChainType);
      if (effectiveChainType === "solana" && !enableSolanaLogin) {
        setStatus(t("Solana 未启用，请先使用 EVM 钱包", "Solana is disabled. Use an EVM wallet first."));
        return;
      }
      if (!address || !chain) {
        setStatus("请先连接钱包");
        return;
      }
      setBusy(intent);
      setStatus("");
      try {
        const nonceResult = await api.post<{ nonce: string; issuedAt: string }>("/auth/nonce", {
          address,
          chainId: chain.id,
          chainType: effectiveChainType,
          intent
        });
        const message = buildSiweMessage({
          address,
          chainId: chain.id,
          nonce: nonceResult.nonce,
          issuedAt: nonceResult.issuedAt,
          statement:
            intent === "login"
              ? "Sign in to Circuit Social. Use a test wallet if this is your first visit."
              : "Bind this wallet to your Circuit Social profile."
        });
        const signature = await signMessageAsync({ message });
        if (intent === "login") {
          const result = await api.post<SessionUserPayload>("/auth/verify", {
            message,
            signature,
            chainType: effectiveChainType,
            domain: window.location.host
          });
          startTransition(() => {
            setSession(result);
            setTab("chats");
          });
        } else {
          const result = await api.post<{
            user: SessionUserPayload["user"];
            wallets: WalletAccount[];
            didStatus?: SessionUserPayload["didStatus"];
          }>("/wallets/bind", {
            message,
            signature,
            chainType: effectiveChainType,
            domain: window.location.host
          });
          setSession({
            user: result.user,
            wallets: result.wallets,
            didStatus: result.didStatus
          });
          setStatus("钱包绑定成功");
        }
      } catch (error) {
        setStatus(mapApiError(error, "签名失败"));
      } finally {
        setBusy(null);
      }
    },
    [
      address,
      bindChainType,
      chain,
      enableSolanaLogin,
      loginChainType,
      setBusy,
      setSession,
      setStatus,
      setTab,
      signMessageAsync,
      t
    ]
  );

  const handleLoginPrimaryAction = useCallback(async () => {
    if (loginChainType === "solana" && !enableSolanaLogin) {
      setStatus(t("Solana 未启用，请先使用 EVM 钱包", "Solana is disabled. Use an EVM wallet first."));
      return;
    }
    if (!isConnected) {
      if (!selectedConnector) {
        setStatus("当前没有可用钱包");
        return;
      }
      setStatus("");
      try {
        await ensureConnector(selectedConnector.id);
      } catch (error) {
        setStatus(mapApiError(error, "钱包连接失败"));
      }
      return;
    }
    await handleSiweLogin("login");
  }, [
    enableSolanaLogin,
    ensureConnector,
    handleSiweLogin,
    isConnected,
    loginChainType,
    selectedConnector,
    setStatus,
    t
  ]);

  return {
    ensureConnector,
    handleSiweLogin,
    handleLoginPrimaryAction
  };
}

