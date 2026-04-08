import { BadRequestException, Injectable } from "@nestjs/common";

type DidResolveResult = {
  uri: string;
  method: "did:ethr";
  network: string;
  identifier: string;
  resolved: boolean;
  cacheHit: boolean;
  ttlMs: number;
  didDocument: {
    id: string;
    verificationMethod: Array<{
      id: string;
      type: string;
      controller: string;
      blockchainAccountId?: string;
    }>;
    authentication: string[];
  };
};

export type DidStatus = {
  status: "unbound" | "resolvable" | "failed";
  network?: string;
  detail: string;
};

type CacheEntry = {
  expiresAt: number;
  value: Omit<DidResolveResult, "cacheHit" | "ttlMs">;
};

const CACHE_TTL_MS = Number(process.env.DID_RESOLVER_TTL_MS ?? 60_000);
const DID_URI_INVALID = "DID_URI_INVALID";

@Injectable()
export class DidResolverService {
  private readonly cache = new Map<string, CacheEntry>();

  resolve(uri: string): DidResolveResult {
    const normalizedUri = uri.trim();
    if (!normalizedUri) {
      throw new BadRequestException({
        message: "DID URI 不能为空",
        code: DID_URI_INVALID
      });
    }

    const now = Date.now();
    const cached = this.cache.get(normalizedUri);
    if (cached && cached.expiresAt > now) {
      return {
        ...cached.value,
        cacheHit: true,
        ttlMs: Math.max(0, cached.expiresAt - now)
      };
    }

    const parsed = this.parseDidEthr(normalizedUri);
    const value: Omit<DidResolveResult, "cacheHit" | "ttlMs"> = {
      uri: normalizedUri,
      method: "did:ethr",
      network: parsed.network,
      identifier: parsed.identifier,
      resolved: true,
      didDocument: this.buildDidDocument(normalizedUri, parsed.network, parsed.identifier)
    };

    const expiresAt = now + CACHE_TTL_MS;
    this.cache.set(normalizedUri, {
      expiresAt,
      value
    });

    return {
      ...value,
      cacheHit: false,
      ttlMs: CACHE_TTL_MS
    };
  }

  getStatus(uri: string | null | undefined): DidStatus {
    const normalized = uri?.trim();
    if (!normalized) {
      return {
        status: "unbound",
        detail: "未绑定"
      };
    }
    try {
      const result = this.resolve(normalized);
      return {
        status: "resolvable",
        network: result.network,
        detail: `可解析 (${result.network})`
      };
    } catch (error) {
      return {
        status: "failed",
        detail: error instanceof Error ? error.message : "解析失败"
      };
    }
  }

  private parseDidEthr(uri: string) {
    const match = uri.match(/^did:ethr(?::([^:]+))?:(.+)$/);
    if (!match) {
      throw new BadRequestException({
        message: "仅支持 did:ethr 格式",
        code: DID_URI_INVALID
      });
    }

    const network = (match[1] ?? "mainnet").trim();
    const identifier = match[2]?.trim();
    if (!identifier) {
      throw new BadRequestException({
        message: "did:ethr 缺少 identifier",
        code: DID_URI_INVALID
      });
    }

    return { network, identifier };
  }

  private buildDidDocument(uri: string, network: string, identifier: string) {
    const controllerRef = `${uri}#owner`;
    const chainId = this.resolveChainId(network);
    const blockchainAccountId =
      chainId && /^0x[a-fA-F0-9]{40}$/.test(identifier) ? `eip155:${chainId}:${identifier}` : undefined;

    return {
      id: uri,
      verificationMethod: [
        {
          id: controllerRef,
          type: "EcdsaSecp256k1RecoveryMethod2020",
          controller: uri,
          ...(blockchainAccountId ? { blockchainAccountId } : {})
        }
      ],
      authentication: [controllerRef]
    };
  }

  private resolveChainId(network: string) {
    const normalized = network.toLowerCase();
    if (normalized === "mainnet") return 1;
    if (normalized === "sepolia") return 11155111;
    if (normalized === "base-sepolia") return 84532;
    const asNumber = Number(normalized);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    return null;
  }
}

