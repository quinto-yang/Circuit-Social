import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Response } from "express";
import bs58 from "bs58";
import { SiweMessage } from "siwe";
import nacl from "tweetnacl";

import { AUTH_ERROR_CODES } from "../common/error-codes";
import { IdentityService } from "../identity/identity.service";
import { MemoryStoreService } from "../store/memory-store.service";
import { AUTH_COOKIE_NAME, CHAIN_LABELS } from "./auth.constants";
import type { ChainType } from "../identity/adapters/chain-adapter";

type VerifyInput = {
  message: string;
  signature: string;
  domainHint?: string;
  chainType?: ChainType;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(MemoryStoreService) private readonly store: MemoryStoreService,
    @Inject(IdentityService) private readonly identityService: IdentityService
  ) {}

  createNonce(input: {
    address: string;
    chainId: number;
    chainType?: ChainType;
    intent: "login" | "bind";
  }) {
    const chainType = input.chainType ?? "evm";
    const adapter = this.identityService.getAdapter(chainType);
    if (!adapter.supportsChain(input.chainId)) {
      throw new BadRequestException({
        message: "暂不支持该链",
        code: AUTH_ERROR_CODES.CHAIN_NOT_SUPPORTED
      });
    }
    if (!adapter.validateAddress(input.address)) {
      throw new BadRequestException({
        message: "钱包地址无效",
        code: AUTH_ERROR_CODES.WALLET_ADDRESS_INVALID
      });
    }
    const normalizedAddress = adapter.normalizeAddress(input.address);
    return this.store.createNonce({
      address: normalizedAddress,
      chainId: input.chainId,
      intent: input.intent
    });
  }

  async verifyLogin(input: VerifyInput) {
    const chainType = input.chainType ?? "evm";
    if (chainType === "solana") {
      return this.verifySolanaLogin(input);
    }
    if (chainType !== "evm") {
      throw new BadRequestException({
        message: "不支持的链类型",
        code: AUTH_ERROR_CODES.CHAIN_TYPE_UNSUPPORTED
      });
    }
    const parsed = new SiweMessage(input.message);
    const nonceRecord = this.store.consumeNonce(parsed.nonce);
    if (!nonceRecord) {
      throw new UnauthorizedException({
        message: "Nonce 无效或已过期",
        code: AUTH_ERROR_CODES.NONCE_INVALID_OR_EXPIRED
      });
    }
    if (nonceRecord.intent !== "login") {
      throw new UnauthorizedException({
        message: "签名用途不匹配",
        code: AUTH_ERROR_CODES.SIGN_INTENT_MISMATCH
      });
    }
    if (new Date(nonceRecord.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException({
        message: "Nonce 已过期",
        code: AUTH_ERROR_CODES.NONCE_EXPIRED
      });
    }
    await this.verifySiwePayload(parsed, input.signature, nonceRecord, input.domainHint);
    const user = this.store.upsertUserForWallet({
      chainId: parsed.chainId,
      chainLabel: CHAIN_LABELS[parsed.chainId],
      address: parsed.address
    });
    const session = this.store.createSession(user.id);
    return {
      user: this.getMe(user.id),
      session
    };
  }

  async bindWallet(userId: number, input: VerifyInput) {
    const chainType = input.chainType ?? "evm";
    if (chainType === "solana") {
      return this.bindSolanaWallet({ ...input, userId });
    }
    if (chainType !== "evm") {
      throw new BadRequestException({
        message: "不支持的链类型",
        code: AUTH_ERROR_CODES.CHAIN_TYPE_UNSUPPORTED
      });
    }
    const parsed = new SiweMessage(input.message);
    const nonceRecord = this.store.consumeNonce(parsed.nonce);
    if (!nonceRecord) {
      throw new UnauthorizedException({
        message: "Nonce 无效或已过期",
        code: AUTH_ERROR_CODES.NONCE_INVALID_OR_EXPIRED
      });
    }
    if (nonceRecord.intent !== "bind") {
      throw new UnauthorizedException({
        message: "签名用途不匹配",
        code: AUTH_ERROR_CODES.SIGN_INTENT_MISMATCH
      });
    }
    await this.verifySiwePayload(parsed, input.signature, nonceRecord, input.domainHint);
    const wallet = this.store.bindWalletToUser({
      userId,
      chainId: parsed.chainId,
      chainLabel: CHAIN_LABELS[parsed.chainId] ?? `Chain ${parsed.chainId}`,
      address: parsed.address
    });
    const me = this.getMe(userId);
    return {
      wallet,
      user: me.user,
      wallets: me.wallets
    };
  }

  private async verifySiwePayload(
    parsed: SiweMessage,
    signature: string,
    nonceRecord: {
      nonce: string;
      address: string;
      chainId: number;
      expiresAt: string;
    },
    domainHint?: string
  ) {
    const expectedDomain = domainHint || parsed.domain;
    try {
      await parsed.verify({
        signature,
        nonce: nonceRecord.nonce,
        domain: expectedDomain,
        time: new Date().toISOString()
      });
    } catch (error) {
      throw new UnauthorizedException({
        message: "SIWE 验证失败",
        code: AUTH_ERROR_CODES.SIWE_VERIFY_FAILED
      });
    }
    if (parsed.address.toLowerCase() !== nonceRecord.address.toLowerCase()) {
      throw new UnauthorizedException({
        message: "签名地址不匹配",
        code: AUTH_ERROR_CODES.SIGNER_ADDRESS_MISMATCH
      });
    }
    if (Number(parsed.chainId) !== nonceRecord.chainId) {
      throw new UnauthorizedException({
        message: "链 ID 不匹配",
        code: AUTH_ERROR_CODES.SIGNER_CHAIN_ID_MISMATCH
      });
    }
  }

  getSessionCookieName() {
    return AUTH_COOKIE_NAME;
  }

  createSessionForUser(userId: number) {
    return this.store.createSession(userId);
  }

  writeSessionCookie(response: Response, sessionId: string) {
    response.cookie(this.getSessionCookieName(), sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    });
  }

  clearSessionCookie(response: Response) {
    response.clearCookie(this.getSessionCookieName(), {
      path: "/"
    });
  }

  resolveUserBySession(sessionId?: string | null) {
    if (!sessionId) return null;
    const session = this.store.getSession(sessionId);
    if (!session) return null;
    return {
      sessionId: session.id,
      user: this.getMe(session.userId)
    };
  }

  getMe(userId: number) {
    return {
      user: this.store.toPublicUser(userId),
      wallets: this.store.getUserWallets(userId)
    };
  }

  removeSession(sessionId: string) {
    this.store.removeSession(sessionId);
  }

  private verifySolanaLogin(input: VerifyInput) {
    const payload = this.validateSolanaVerifyPayload(input.message, input.signature);
    const nonceRecord = this.store.consumeNonce(payload.nonce);
    if (!nonceRecord) {
      throw new UnauthorizedException({
        message: "Nonce 无效或已过期",
        code: AUTH_ERROR_CODES.NONCE_INVALID_OR_EXPIRED
      });
    }
    if (nonceRecord.intent !== "login") {
      throw new UnauthorizedException({
        message: "签名用途不匹配",
        code: AUTH_ERROR_CODES.SIGN_INTENT_MISMATCH
      });
    }
    if (new Date(nonceRecord.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException({
        message: "Nonce 已过期",
        code: AUTH_ERROR_CODES.NONCE_EXPIRED
      });
    }
    if (nonceRecord.address !== payload.address.toLowerCase()) {
      throw new UnauthorizedException({
        message: "签名地址不匹配",
        code: AUTH_ERROR_CODES.SIGNER_ADDRESS_MISMATCH
      });
    }
    if (nonceRecord.chainId !== payload.chainId) {
      throw new UnauthorizedException({
        message: "链 ID 不匹配",
        code: AUTH_ERROR_CODES.SIGNER_CHAIN_ID_MISMATCH
      });
    }
    const user = this.store.upsertUserForWallet({
      chainId: payload.chainId,
      chainLabel: CHAIN_LABELS[payload.chainId] ?? `Chain ${payload.chainId}`,
      address: payload.address
    });
    const session = this.store.createSession(user.id);
    return {
      user: this.getMe(user.id),
      session
    };
  }

  private bindSolanaWallet(input: VerifyInput & { userId?: number }) {
    if (!input.userId) {
      throw new UnauthorizedException({
        message: "请先登录",
        code: AUTH_ERROR_CODES.NONCE_INVALID_OR_EXPIRED
      });
    }
    const payload = this.validateSolanaVerifyPayload(input.message, input.signature);
    const nonceRecord = this.store.consumeNonce(payload.nonce);
    if (!nonceRecord) {
      throw new UnauthorizedException({
        message: "Nonce 无效或已过期",
        code: AUTH_ERROR_CODES.NONCE_INVALID_OR_EXPIRED
      });
    }
    if (nonceRecord.intent !== "bind") {
      throw new UnauthorizedException({
        message: "签名用途不匹配",
        code: AUTH_ERROR_CODES.SIGN_INTENT_MISMATCH
      });
    }
    if (nonceRecord.address !== payload.address.toLowerCase()) {
      throw new UnauthorizedException({
        message: "签名地址不匹配",
        code: AUTH_ERROR_CODES.SIGNER_ADDRESS_MISMATCH
      });
    }
    if (nonceRecord.chainId !== payload.chainId) {
      throw new UnauthorizedException({
        message: "链 ID 不匹配",
        code: AUTH_ERROR_CODES.SIGNER_CHAIN_ID_MISMATCH
      });
    }
    const wallet = this.store.bindWalletToUser({
      userId: input.userId,
      chainId: payload.chainId,
      chainLabel: CHAIN_LABELS[payload.chainId] ?? `Chain ${payload.chainId}`,
      address: payload.address
    });
    const me = this.getMe(input.userId);
    return {
      wallet,
      user: me.user,
      wallets: me.wallets
    };
  }

  private validateSolanaVerifyPayload(message: string, signature: string) {
    if (!message || !signature) {
      throw new BadRequestException({
        message: "Solana 验签参数缺失",
        code: AUTH_ERROR_CODES.SOLANA_INVALID_PAYLOAD
      });
    }
    let parsed: {
      address: string;
      chainId: number;
      nonce: string;
      issuedAt: string;
    };
    try {
      const parsedRaw = JSON.parse(message) as {
        address?: string;
        chainId?: number;
        nonce?: string;
        issuedAt?: string;
      };
      if (
        !parsedRaw.address ||
        typeof parsedRaw.chainId !== "number" ||
        !parsedRaw.nonce ||
        !parsedRaw.issuedAt
      ) {
        throw new Error("invalid solana payload");
      }
      parsed = {
        address: parsedRaw.address,
        chainId: parsedRaw.chainId,
        nonce: parsedRaw.nonce,
        issuedAt: parsedRaw.issuedAt
      };
    } catch {
      throw new BadRequestException({
        message: "Solana 消息载荷格式无效",
        code: AUTH_ERROR_CODES.SOLANA_INVALID_PAYLOAD
      });
    }
    try {
      const publicKey = bs58.decode(parsed.address);
      const signedMessage = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const verified = nacl.sign.detached.verify(signedMessage, signatureBytes, publicKey);
      if (!verified) {
        throw new UnauthorizedException({
          message: "Solana 验签失败",
          code: AUTH_ERROR_CODES.SOLANA_VERIFY_FAILED
        });
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException({
        message: "Solana 签名格式无效",
        code: AUTH_ERROR_CODES.SOLANA_INVALID_PAYLOAD
      });
    }
    return parsed;
  }
}
