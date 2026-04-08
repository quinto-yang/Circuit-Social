import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { SessionGuard } from "../auth/session.guard";
import { TenantService } from "./tenant.service";

@Controller("tenant")
@UseGuards(SessionGuard)
export class TenantController {
  constructor(@Inject(TenantService) private readonly tenantService: TenantService) {}

  @Get("apps")
  listApps(@Req() request: AuthenticatedRequest) {
    return {
      ok: true,
      ...this.tenantService.listApps(request.authUserId)
    };
  }

  @Post("apps")
  createApp(
    @Req() request: AuthenticatedRequest,
    @Body() body: { name: string; chainPolicy?: Array<"evm" | "solana">; callbackUrl?: string | null }
  ) {
    return {
      ok: true,
      ...this.tenantService.createApp(request.authUserId, body)
    };
  }

  @Post("apps/:id/domains")
  addDomain(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) appId: number,
    @Body() body: { domain: string }
  ) {
    return {
      ok: true,
      ...this.tenantService.addDomain(request.authUserId, appId, body)
    };
  }

  @Post("apps/:id")
  updateApp(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) appId: number,
    @Body()
    body: {
      name?: string;
      chainPolicy?: Array<"evm" | "solana">;
      callbackUrl?: string | null;
    }
  ) {
    return {
      ok: true,
      ...this.tenantService.updateApp(request.authUserId, appId, body)
    };
  }

  @Post("apps/:id/keys/rotate")
  rotateAppKey(@Req() request: AuthenticatedRequest, @Param("id", ParseIntPipe) appId: number) {
    return {
      ok: true,
      ...this.tenantService.rotateAppKey(request.authUserId, appId)
    };
  }

  @Post("apps/:id/branding")
  updateBranding(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseIntPipe) appId: number,
    @Body() body: { logoUrl?: string | null; themeColor?: string | null; displayName?: string | null }
  ) {
    return {
      ok: true,
      ...this.tenantService.updateBranding(request.authUserId, appId, body)
    };
  }
}

