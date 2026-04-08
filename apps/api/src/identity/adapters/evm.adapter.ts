import { Injectable } from "@nestjs/common";

import type { ChainAdapter } from "./chain-adapter";

@Injectable()
export class EvmAdapter implements ChainAdapter {
  readonly chainType = "evm" as const;

  private readonly supportedChainIds = new Set([1, 56, 8453, 42161, 11155111, 84532]);

  supportsChain(chainId: number) {
    return this.supportedChainIds.has(chainId);
  }

  normalizeAddress(address: string) {
    return address.toLowerCase();
  }

  validateAddress(address: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
