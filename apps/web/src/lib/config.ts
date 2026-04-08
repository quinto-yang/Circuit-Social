function resolveApiOrigin() {
  if (process.env.NEXT_PUBLIC_API_ORIGIN) {
    return process.env.NEXT_PUBLIC_API_ORIGIN;
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://127.0.0.1:4000";
}

export const webConfig = {
  get apiOrigin() {
    return resolveApiOrigin();
  },
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Circuit Social",
  adsEnabled: process.env.NEXT_PUBLIC_ADS_ENABLED === "true",
  enableSolanaLogin: process.env.NEXT_PUBLIC_ENABLE_SOLANA_LOGIN === "true"
} as const;
