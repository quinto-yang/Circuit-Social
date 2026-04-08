import { Controller, Get, Inject, Query } from "@nestjs/common";

import { DidResolverService } from "./did-resolver.service";

@Controller("did")
export class DidController {
  constructor(@Inject(DidResolverService) private readonly didResolverService: DidResolverService) {}

  @Get("resolve")
  resolve(@Query("uri") uri: string) {
    return {
      ok: true,
      ...this.didResolverService.resolve(uri ?? "")
    };
  }
}

