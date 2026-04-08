import { Inject, Injectable } from "@nestjs/common";

import type { ChainAdapter, ChainType } from "./adapters/chain-adapter";
import { EvmAdapter } from "./adapters/evm.adapter";
import { SolanaAdapter } from "./adapters/solana.adapter";

@Injectable()
export class IdentityService {
  private readonly adapters: ChainAdapter[];

  constructor(
    @Inject(EvmAdapter) evmAdapter: EvmAdapter,
    @Inject(SolanaAdapter) solanaAdapter: SolanaAdapter
  ) {
    this.adapters = [evmAdapter, solanaAdapter];
  }

  getAdapter(chainType: ChainType) {
    const adapter = this.adapters.find((item) => item.chainType === chainType);
    if (!adapter) {
      throw new Error(`不支持的链类型: ${chainType}`);
    }
    return adapter;
  }
}
