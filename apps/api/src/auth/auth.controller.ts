import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import type { Response } from "express";

import { DidResolverService } from "../did/did-resolver.service";
import { MemoryStoreService } from "../store/memory-store.service";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";
import type { AuthenticatedRequest } from "./auth.types";
import type { ChainType } from "../identity/adapters/chain-adapter";

@Controller()
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(MemoryStoreService) private readonly store: MemoryStoreService,
    @Inject(DidResolverService) private readonly didResolverService: DidResolverService
  ) {
    this.createNonce = this.createNonce.bind(this);
    this.verify = this.verify.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
    this.bindWallet = this.bindWallet.bind(this);
    this.removeWallet = this.removeWallet.bind(this);
  }

  @Post("auth/nonce")
  createNonce(
    @Body()
    body: {
      address: string;
      chainId: number;
      chainType?: ChainType;
      intent?: "login" | "bind";
    }
  ) {
    const nonce = this.authService.createNonce({
      address: body.address,
      chainId: Number(body.chainId),
      chainType: body.chainType ?? "evm",
      intent: body.intent ?? "login"
    });
    return {
      ok: true,
      nonce: nonce.nonce,
      issuedAt: nonce.issuedAt,
      expiresAt: nonce.expiresAt
    };
  }

  @Post("auth/verify")
  async verify(
    @Body()
    body: {
      message: string;
      signature: string;
      chainType?: ChainType;
      domain?: string;
    },
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.verifyLogin({
      message: body.message,
      signature: body.signature,
      domainHint: body.domain,
      chainType: body.chainType ?? "evm"
    });
    this.authService.writeSessionCookie(response, result.session.id);
    return {
      ok: true,
      ...result.user,
      didStatus: this.didResolverService.getStatus(result.user.user.didUri)
    };
  }

  @Post("auth/logout")
  @UseGuards(SessionGuard)
  logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const sessionCookie =
      request.cookies?.[this.authService.getSessionCookieName()] ?? request.sessionId ?? null;
    if (sessionCookie) {
      this.authService.removeSession(sessionCookie);
    }
    this.authService.clearSessionCookie(response);
    return { ok: true };
  }

  @Get("me")
  me(@Req() request: AuthenticatedRequest) {
    const sessionCookie =
      request.cookies?.[this.authService.getSessionCookieName()] ?? null;
    const auth = this.authService.resolveUserBySession(sessionCookie);
    if (!auth) {
      return { ok: true, user: null };
    }
    return {
      ok: true,
      ...auth.user,
      didStatus: this.didResolverService.getStatus(auth.user.user.didUri)
    };
  }

  @Post("wallets/bind")
  @UseGuards(SessionGuard)
  async bindWallet(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      message: string;
      signature: string;
      chainType?: ChainType;
      domain?: string;
    }
  ) {
    const sessionCookie =
      request.cookies?.[this.authService.getSessionCookieName()] ?? request.sessionId ?? null;
    const auth = this.authService.resolveUserBySession(sessionCookie);
    if (!auth) {
      throw new UnauthorizedException("未登录");
    }
    return {
      ok: true,
      ...(await this.authService.bindWallet(auth.user.user.id, {
        message: body.message,
        signature: body.signature,
        domainHint: body.domain,
        chainType: body.chainType ?? "evm"
      })),
      didStatus: this.didResolverService.getStatus(auth.user.user.didUri)
    };
  }

  @Delete("wallets/:walletId")
  @UseGuards(SessionGuard)
  removeWallet(
    @Req() request: AuthenticatedRequest,
    @Param("walletId", ParseIntPipe) walletId: number
  ) {
    this.store.removeWallet(request.authUserId, walletId);
    const me = this.authService.getMe(request.authUserId);
    return {
      ok: true,
      ...me,
      didStatus: this.didResolverService.getStatus(me.user.didUri)
    };
  }
}
