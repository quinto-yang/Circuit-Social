import { webConfig } from "@/lib/config";

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function isOfficialAccount(nickname: string) {
  return /concierge|official|circuit/i.test(nickname);
}

export function buildAssetUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${webConfig.apiOrigin}${value}`;
}

export function formatTime(value: string, locale: "zh" | "en") {
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function getAddressExplorerUrl(
  chain: { blockExplorers?: { default?: { url: string } } } | null | undefined,
  address: string | undefined
) {
  const base = chain?.blockExplorers?.default?.url;
  if (!base || !address) return null;
  return `${base.replace(/\/$/, "")}/address/${address}`;
}

export function getExplorerBaseUrlByChainId(chainId: number) {
  if (chainId === 1) return "https://etherscan.io";
  if (chainId === 10) return "https://optimistic.etherscan.io";
  if (chainId === 56) return "https://bscscan.com";
  if (chainId === 137) return "https://polygonscan.com";
  if (chainId === 8453) return "https://basescan.org";
  if (chainId === 42161) return "https://arbiscan.io";
  if (chainId === 11155111) return "https://sepolia.etherscan.io";
  return null;
}

export function connectorEnvHint(
  connector: { id: string; name: string },
  t: (zh: string, en: string) => string
): string | null {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  if (id.includes("injected") || id === "io.metamask" || /metamask|browser|rabby|coinbase/i.test(name)) {
    return t("浏览器 · 桌面常用", "Browser · desktop");
  }
  if (id.includes("okx") || name.includes("okx")) {
    return t("OKX · 移动常用", "OKX · mobile");
  }
  return null;
}

