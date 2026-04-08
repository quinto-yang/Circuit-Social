import { Module } from "@nestjs/common";

import { EvmAdapter } from "./adapters/evm.adapter";
import { SolanaAdapter } from "./adapters/solana.adapter";
import { IdentityService } from "./identity.service";

@Module({
  providers: [IdentityService, EvmAdapter, SolanaAdapter],
  exports: [IdentityService]
})
export class IdentityModule {}
