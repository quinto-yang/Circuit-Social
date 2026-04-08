"use client";

import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia, base, baseSepolia, arbitrum, bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import { webConfig } from "./config";

const connectors = webConfig.walletConnectProjectId
  ? [
      injected(),
      walletConnect({
        projectId: webConfig.walletConnectProjectId,
        showQrModal: true,
        metadata: {
          name: webConfig.appName,
          description: "Multi-chain EVM social H5",
          url: "http://localhost:3000",
          icons: []
        }
      })
    ]
  : [injected()];

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, base, baseSepolia, arbitrum, bsc],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http()
  }
});

export const queryClient = new QueryClient();
