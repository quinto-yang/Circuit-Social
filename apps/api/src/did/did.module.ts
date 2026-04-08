import { Module } from "@nestjs/common";

import { DidController } from "./did.controller";
import { DidResolverService } from "./did-resolver.service";

@Module({
  controllers: [DidController],
  providers: [DidResolverService],
  exports: [DidResolverService]
})
export class DidModule {}

