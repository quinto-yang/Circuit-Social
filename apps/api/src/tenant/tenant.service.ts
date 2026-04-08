import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { MemoryStoreService } from "../store/memory-store.service";

@Injectable()
export class TenantService {
  private readonly keyRotateCooldownMs = 5 * 60 * 1000;
  constructor(@Inject(MemoryStoreService) private readonly store: MemoryStoreService) {}

  listApps(userId: number) {
    const apps = this.store.listTenantAppsByOwner(userId).map((app) => ({
      ...app,
      domains: this.store.listTenantDomains(app.id),
      keys: this.store.listTenantKeys(app.id),
      branding: this.store.getTenantBranding(app.id)
    }));
    return { apps };
  }

  createApp(
    userId: number,
    input: {
      name: string;
      chainPolicy?: Array<"evm" | "solana">;
      callbackUrl?: string | null;
    }
  ) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("应用名称不能为空");
    }
    const chainPolicy = (input.chainPolicy?.length ? input.chainPolicy : ["evm"]).filter(
      (item, index, arr) => (item === "evm" || item === "solana") && arr.indexOf(item) === index
    ) as Array<"evm" | "solana">;
    if (!chainPolicy.length) {
      throw new BadRequestException("至少选择一种链策略");
    }
    const callbackUrl = input.callbackUrl?.trim() || null;
    if (callbackUrl) {
      this.assertCallbackUrl(callbackUrl);
    }

    const app = this.store.createTenantApp({
      ownerUserId: userId,
      name,
      chainPolicy,
      callbackUrl
    });

    return {
      app,
      domains: this.store.listTenantDomains(app.id),
      keys: this.store.listTenantKeys(app.id),
      branding: this.store.getTenantBranding(app.id)
    };
  }

  addDomain(userId: number, appId: number, input: { domain: string }) {
    const app = this.store.getTenantAppById(appId);
    if (!app || app.ownerUserId !== userId) {
      throw new BadRequestException("应用不存在");
    }
    const domain = this.normalizeDomain(input.domain);
    this.store.addTenantDomain(appId, domain);
    return {
      app,
      domains: this.store.listTenantDomains(appId),
      keys: this.store.listTenantKeys(app.id),
      branding: this.store.getTenantBranding(app.id)
    };
  }

  updateApp(
    userId: number,
    appId: number,
    input: {
      name?: string;
      chainPolicy?: Array<"evm" | "solana">;
      callbackUrl?: string | null;
    }
  ) {
    const app = this.store.getTenantAppById(appId);
    if (!app || app.ownerUserId !== userId) {
      throw new BadRequestException("应用不存在");
    }
    const normalizedName = input.name?.trim();
    if (input.name !== undefined && !normalizedName) {
      throw new BadRequestException("应用名称不能为空");
    }
    const chainPolicy =
      input.chainPolicy !== undefined
        ? (input.chainPolicy.filter(
            (item, index, arr) =>
              (item === "evm" || item === "solana") && arr.indexOf(item) === index
          ) as Array<"evm" | "solana">)
        : undefined;
    if (input.chainPolicy !== undefined && !(chainPolicy && chainPolicy.length)) {
      throw new BadRequestException("至少选择一种链策略");
    }
    const callbackUrl =
      input.callbackUrl !== undefined ? input.callbackUrl?.trim() || null : undefined;
    if (callbackUrl) {
      this.assertCallbackUrl(callbackUrl);
      this.assertCallbackMatchesDomains(appId, callbackUrl);
    }

    const updated = this.store.updateTenantApp(appId, {
      name: normalizedName,
      chainPolicy,
      callbackUrl
    });
    return {
      app: updated,
      domains: this.store.listTenantDomains(appId),
      keys: this.store.listTenantKeys(appId),
      branding: this.store.getTenantBranding(appId)
    };
  }

  rotateAppKey(userId: number, appId: number) {
    const app = this.store.getTenantAppById(appId);
    if (!app || app.ownerUserId !== userId) {
      throw new BadRequestException("应用不存在");
    }
    const active = this.store.listTenantKeys(appId).find((item) => item.status === "active");
    if (active) {
      const elapsed = Date.now() - new Date(active.createdAt).getTime();
      if (elapsed < this.keyRotateCooldownMs) {
        throw new BadRequestException("密钥轮换过于频繁，请稍后再试");
      }
    }
    this.store.rotateTenantKey(appId, userId);
    return {
      app,
      domains: this.store.listTenantDomains(appId),
      keys: this.store.listTenantKeys(appId),
      branding: this.store.getTenantBranding(appId)
    };
  }

  updateBranding(
    userId: number,
    appId: number,
    input: {
      logoUrl?: string | null;
      themeColor?: string | null;
      displayName?: string | null;
    }
  ) {
    const app = this.store.getTenantAppById(appId);
    if (!app || app.ownerUserId !== userId) {
      throw new BadRequestException("应用不存在");
    }
    const logoUrl = input.logoUrl !== undefined ? input.logoUrl?.trim() || null : undefined;
    if (logoUrl) {
      this.assertCallbackUrl(logoUrl);
    }
    const themeColor =
      input.themeColor !== undefined
        ? input.themeColor?.trim().toLowerCase() || "#22c55e"
        : undefined;
    if (themeColor && !/^#([0-9a-f]{6})$/.test(themeColor)) {
      throw new BadRequestException("主题色格式无效");
    }
    const displayName =
      input.displayName !== undefined ? input.displayName?.trim() || null : undefined;
    if (displayName !== undefined && displayName && displayName.length > 32) {
      throw new BadRequestException("品牌名称过长");
    }
    this.store.upsertTenantBranding(appId, {
      logoUrl,
      themeColor,
      displayName
    });
    return {
      app,
      domains: this.store.listTenantDomains(appId),
      keys: this.store.listTenantKeys(appId),
      branding: this.store.getTenantBranding(appId)
    };
  }

  private normalizeDomain(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value) {
      throw new BadRequestException("域名不能为空");
    }
    if (!/^[a-z0-9.-]+(?::\d+)?$/.test(value)) {
      throw new BadRequestException("域名格式无效");
    }
    return value;
  }

  private assertCallbackUrl(value: string) {
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new BadRequestException("回调地址无效");
    }
  }

  private assertCallbackMatchesDomains(appId: number, callbackUrl: string) {
    const domains = this.store.listTenantDomains(appId).map((item) => item.domain);
    if (!domains.length) return;
    const hostname = new URL(callbackUrl).host.toLowerCase();
    const isLocalhost = hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1");
    if (isLocalhost) return;
    const matched = domains.some((domain) => hostname === domain.toLowerCase());
    if (!matched) {
      throw new BadRequestException("回调地址域名不在白名单中");
    }
  }
}

