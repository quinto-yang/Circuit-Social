import { SiweMessage } from "siwe";

export type ChainType = "evm" | "solana";

export type CxSessionPayload = {
  user: {
    id: number;
    nickname: string;
    bio: string;
    avatarUrl: string | null;
    didUri: string | null;
    encryptionPublicKey: string | null;
    primaryWalletAddress: string;
    primaryChainId: number;
    primaryChainLabel: string;
  } | null;
  wallets?: Array<{
    id: number;
    userId: number;
    chainId: number;
    chainLabel: string;
    address: string;
    isPrimary: boolean;
    createdAt: string;
  }>;
  didStatus?: {
    status: "unbound" | "resolvable" | "failed";
    network?: string;
    detail: string;
  };
};

export type CxIdentityClientConfig = {
  apiOrigin: string;
  credentials?: RequestCredentials;
  defaultDomain?: string;
  defaultUri?: string;
};

export type LoginInput = {
  address: string;
  chainId: number;
  chainType?: ChainType;
  domain?: string;
  statement?: string;
  signMessage?: (message: string) => Promise<string>;
  preparedMessage?: string;
  preparedSignature?: string;
};

export type BindWalletInput = LoginInput;

type ApiErrorPayload = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
};

export class CxIdentityClient {
  private readonly apiOrigin: string;
  private readonly credentials: RequestCredentials;
  private readonly defaultDomain?: string;
  private readonly defaultUri?: string;

  constructor(config: CxIdentityClientConfig) {
    this.apiOrigin = config.apiOrigin.replace(/\/$/, "");
    this.credentials = config.credentials ?? "include";
    this.defaultDomain = config.defaultDomain;
    this.defaultUri = config.defaultUri;
  }

  async init() {
    return this.getSession();
  }

  async getSession() {
    return this.request<CxSessionPayload>("/me");
  }

  async logout() {
    await this.request("/auth/logout", {
      method: "POST"
    });
  }

  async login(input: LoginInput) {
    return this.signAndVerify({
      intent: "login",
      statement:
        input.statement ??
        "Sign in to Circuit Social. Use a test wallet if this is your first visit.",
      ...input
    });
  }

  async bindWallet(input: BindWalletInput) {
    return this.signAndVerify({
      intent: "bind",
      statement: input.statement ?? "Bind this wallet to your Circuit Social profile.",
      ...input
    });
  }

  private async signAndVerify(input: LoginInput & { intent: "login" | "bind"; statement: string }) {
    const chainType = input.chainType ?? "evm";
    const nonce = await this.request<{ nonce: string; issuedAt: string }>("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({
        address: input.address,
        chainId: input.chainId,
        chainType,
        intent: input.intent
      })
    });

    const message =
      input.preparedMessage ??
      (chainType === "solana"
        ? this.buildSolanaMessage({
            address: input.address,
            chainId: input.chainId,
            nonce: nonce.nonce,
            issuedAt: nonce.issuedAt
          })
        : this.buildSiweMessage({
            address: input.address,
            chainId: input.chainId,
            nonce: nonce.nonce,
            issuedAt: nonce.issuedAt,
            statement: input.statement,
            domain: input.domain
          }));

    const signature =
      input.preparedSignature ??
      (input.signMessage ? await input.signMessage(message) : Promise.reject(new Error("缺少 signMessage 回调")));

    if (input.intent === "login") {
      return this.request<CxSessionPayload>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          message,
          signature,
          chainType,
          domain: input.domain ?? this.defaultDomain
        })
      });
    }

    return this.request<CxSessionPayload>("/wallets/bind", {
      method: "POST",
      body: JSON.stringify({
        message,
        signature,
        chainType,
        domain: input.domain ?? this.defaultDomain
      })
    });
  }

  private buildSiweMessage(input: {
    address: string;
    chainId: number;
    nonce: string;
    issuedAt: string;
    statement: string;
    domain?: string;
  }) {
    const domain = input.domain ?? this.defaultDomain ?? "localhost";
    const uri = this.defaultUri ?? `https://${domain}`;
    return new SiweMessage({
      domain,
      address: input.address,
      statement: input.statement,
      uri,
      version: "1",
      chainId: input.chainId,
      nonce: input.nonce,
      issuedAt: input.issuedAt
    }).prepareMessage();
  }

  private buildSolanaMessage(input: {
    address: string;
    chainId: number;
    nonce: string;
    issuedAt: string;
  }) {
    return JSON.stringify({
      address: input.address,
      chainId: input.chainId,
      nonce: input.nonce,
      issuedAt: input.issuedAt
    });
  }

  private async request<T = { ok: true }>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.apiOrigin}/api${path}`, {
      credentials: this.credentials,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      ...init
    });

    const data = (await response.json().catch(() => null)) as ApiErrorPayload | T | null;
    if (!response.ok || (data && typeof data === "object" && "ok" in data && data.ok === false)) {
      const payload = (data ?? {}) as ApiErrorPayload;
      const error = new Error(payload.error ?? `请求失败: ${path}`) as Error & { code?: string };
      if (payload.errorCode) {
        error.code = payload.errorCode;
      }
      throw error;
    }
    return data as T;
  }
}

export function createCxIdentityClient(config: CxIdentityClientConfig) {
  return new CxIdentityClient(config);
}

