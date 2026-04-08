import { Injectable } from "@nestjs/common";

import type { ChainAdapter } from "./chain-adapter";

@Injectable()
export class SolanaAdapter implements ChainAdapter {
  readonly chainType = "solana" as const;

  private readonly supportedChainIds = new Set(
    (process.env.SOLANA_SUPPORTED_CHAIN_IDS ?? "101,102,103")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item))
  );

  supportsChain(chainId: number) {
    return this.supportedChainIds.has(chainId);
  }

  normalizeAddress(address: string) {
    return address.trim();
  }

  validateAddress(address: string) {
    // Base58 length check placeholder for W1 skeleton.
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
  }
}
