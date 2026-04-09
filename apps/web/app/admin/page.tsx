"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { webConfig } from "@/lib/config";

type SiteSettings = {
  features: {
    enableSolanaLogin: boolean;
  };
  branding: {
    appName: string;
    logoUrl: string;
    themeColor: string;
  };
  support: {
    email: string;
    wechat: string;
    telegram: string;
    websiteUrl: string;
    xUrl: string;
    discordUrl: string;
  };
  banners: {
    slots: Record<
      "chats-top" | "contacts-middle" | "discover-menu-top" | "moments-feed-top",
      {
        enabled: boolean;
        titleZh: string;
        titleEn: string;
        descriptionZh: string;
        descriptionEn: string;
      }
    >;
  };
  discover: {
    tags: string[];
    lounges: Array<{
      name: string;
      members: string;
      activeZh: string;
      activeEn: string;
    }>;
    cards: Array<{
      id: string;
      visible: boolean;
      titleZh: string;
      titleEn: string;
      subtitleZh: string;
      subtitleEn: string;
      action: "openMoments";
    }>;
    hot: {
      enabled: boolean;
      titleZh: string;
      titleEn: string;
      hintZh: string;
      hintEn: string;
      moments: { enabled: boolean; titleZh: string; titleEn: string; limit: number };
      groups: { enabled: boolean; titleZh: string; titleEn: string; limit: number };
      recommendedUsers: { enabled: boolean; titleZh: string; titleEn: string; limit: number };
    };
  };
};

type ApiErr = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
};

type OverviewCounts = {
  users: number;
  wallets: number;
  activeSessions: number;
  conversations: number;
  messages: number;
  moments: number;
  friendRequestsPending: number;
  reports: number;
  tenantApps: number;
  auditLogEntries: number;
};

type AuditItem = {
  id: number;
  actorId: number | null;
  action: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
};

type AuditQuery = {
  action: string;
  targetType: string;
  startAt: string;
  endAt: string;
  offset: number;
  limit: number;
};

type AdminPanelKey = "public" | "security" | "settings" | "ops";
type ToastTone = "success" | "error" | "info";

const BTN_PRIMARY = "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const BTN_SUCCESS = "rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const BTN_SECONDARY = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";
const BTN_GHOST = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";

function LoadingDot() {
  return <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-current align-middle" />;
}

function toLocalDateTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAdminFailure(status: number, data: ApiErr): string {
  const code = data.errorCode;
  const msg = typeof data.error === "string" ? data.error : "";
  if (code === "ADMIN_UNAUTHORIZED") {
    return `${msg || "管理密钥无效"}（请核对服务端 ADMIN_TOKEN 与此处输入的 Bearer 是否一致）`;
  }
  if (code === "ADMIN_TOKEN_EMPTY") {
    return "新管理密钥不能为空";
  }
  if (code === "ADMIN_TOKEN_TOO_SHORT") {
    return "新管理密钥至少 4 位";
  }
  return msg || `请求失败（HTTP ${status}）`;
}

async function readJson(response: Response): Promise<ApiErr & Record<string, unknown>> {
  try {
    return (await response.json()) as ApiErr & Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatDiscoverLounges(
  lounges: SiteSettings["discover"]["lounges"] | undefined
): string {
  if (!lounges?.length) return "";
  return lounges.map((item) => `${item.name}|${item.members}|${item.activeZh}|${item.activeEn}`).join("\n");
}

function parseDiscoverLounges(raw: string): SiteSettings["discover"]["lounges"] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name = "", members = "", activeZh = "", activeEn = ""] = line.split("|").map((part) => part.trim());
      return { name, members, activeZh, activeEn };
    })
    .filter((item) => item.name && item.members && item.activeZh && item.activeEn);
}

function parseDiscoverLoungesDetailed(raw: string): {
  valid: SiteSettings["discover"]["lounges"];
  invalidLines: number[];
} {
  const valid: SiteSettings["discover"]["lounges"] = [];
  const invalidLines: number[] = [];
  const lines = raw.split("\n");
  lines.forEach((line, index) => {
    const content = line.trim();
    if (!content) return;
    const [name = "", members = "", activeZh = "", activeEn = ""] = content.split("|").map((part) => part.trim());
    if (name && members && activeZh && activeEn) {
      valid.push({ name, members, activeZh, activeEn });
    } else {
      invalidLines.push(index + 1);
    }
  });
  return { valid, invalidLines };
}

function isLikelyUrl(value: string) {
  if (!value.trim()) return true;
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isLikelyEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isLikelyHexColor(value: string) {
  if (!value.trim()) return true;
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value.trim());
}

function ensureDefaultConfig(): SiteSettings {
  return {
    features: { enableSolanaLogin: false },
    branding: { appName: "Circuit Social", logoUrl: "", themeColor: "#22c55e" },
    support: {
      email: "support@circuit.social",
      wechat: "CircuitSocial",
      telegram: "@CircuitSocial",
      websiteUrl: "",
      xUrl: "",
      discordUrl: ""
    },
    banners: {
      slots: {
        "chats-top": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
        "contacts-middle": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
        "discover-menu-top": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" },
        "moments-feed-top": { enabled: false, titleZh: "", titleEn: "", descriptionZh: "", descriptionEn: "" }
      }
    },
    discover: {
      tags: ["兴趣圈", "Builder", "活动", "Mini Apps"],
      lounges: [],
      cards: [
        {
          id: "moments",
          visible: true,
          titleZh: "朋友圈",
          titleEn: "Moments",
          subtitleZh: "查看与发布链上动态",
          subtitleEn: "View and publish on-chain updates",
          action: "openMoments"
        }
      ],
      hot: {
        enabled: true,
        titleZh: "热榜",
        titleEn: "Hot right now",
        hintZh: "真实数据",
        hintEn: "Real data",
        moments: { enabled: true, titleZh: "热帖", titleEn: "Hot moments", limit: 3 },
        groups: { enabled: true, titleZh: "热群（真实互动）", titleEn: "Hot groups (live)", limit: 5 },
        recommendedUsers: { enabled: true, titleZh: "推荐用户", titleEn: "Recommended users", limit: 6 }
      }
    }
  };
}

function clampHotLimit(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(20, Math.max(0, Math.floor(n)));
}

/** 与服务端 `coerceHotBoardMasterSwitch` 一致：子榜全关则关闭总开关 */
function coerceHotMasterIfNoSubsections(hot: SiteSettings["discover"]["hot"]): SiteSettings["discover"]["hot"] {
  const anySub =
    hot.moments.enabled || hot.groups.enabled || hot.recommendedUsers.enabled;
  if (!anySub && hot.enabled) {
    return { ...hot, enabled: false };
  }
  return hot;
}

type HotSubSectionPartial = Partial<SiteSettings["discover"]["hot"]["moments"]>;

function mergeHotFromPayload(
  hot: Partial<SiteSettings["discover"]["hot"]> | undefined
): SiteSettings["discover"]["hot"] {
  const base = ensureDefaultConfig().discover.hot;
  if (!hot) return base;
  const m: HotSubSectionPartial = hot.moments ?? {};
  const g: HotSubSectionPartial = hot.groups ?? {};
  const r: HotSubSectionPartial = hot.recommendedUsers ?? {};
  const merged: SiteSettings["discover"]["hot"] = {
    enabled: typeof hot.enabled === "boolean" ? hot.enabled : base.enabled,
    titleZh: typeof hot.titleZh === "string" ? hot.titleZh : base.titleZh,
    titleEn: typeof hot.titleEn === "string" ? hot.titleEn : base.titleEn,
    hintZh: typeof hot.hintZh === "string" ? hot.hintZh : base.hintZh,
    hintEn: typeof hot.hintEn === "string" ? hot.hintEn : base.hintEn,
    moments: {
      enabled: typeof m.enabled === "boolean" ? m.enabled : base.moments.enabled,
      titleZh: typeof m.titleZh === "string" ? m.titleZh : base.moments.titleZh,
      titleEn: typeof m.titleEn === "string" ? m.titleEn : base.moments.titleEn,
      limit: m.limit !== undefined ? clampHotLimit(m.limit, base.moments.limit) : base.moments.limit
    },
    groups: {
      enabled: typeof g.enabled === "boolean" ? g.enabled : base.groups.enabled,
      titleZh: typeof g.titleZh === "string" ? g.titleZh : base.groups.titleZh,
      titleEn: typeof g.titleEn === "string" ? g.titleEn : base.groups.titleEn,
      limit: g.limit !== undefined ? clampHotLimit(g.limit, base.groups.limit) : base.groups.limit
    },
    recommendedUsers: {
      enabled: typeof r.enabled === "boolean" ? r.enabled : base.recommendedUsers.enabled,
      titleZh: typeof r.titleZh === "string" ? r.titleZh : base.recommendedUsers.titleZh,
      titleEn: typeof r.titleEn === "string" ? r.titleEn : base.recommendedUsers.titleEn,
      limit: r.limit !== undefined ? clampHotLimit(r.limit, base.recommendedUsers.limit) : base.recommendedUsers.limit
    }
  };
  return coerceHotMasterIfNoSubsections(merged);
}

function coerceSettingsPayload(data: Record<string, unknown>): SiteSettings | null {
  // Preferred shape: { branding, support, banners:{slots}, discover, features }
  const hasBannerSlots =
    data.banners &&
    typeof data.banners === "object" &&
    "slots" in data.banners &&
    (data.banners as { slots?: unknown }).slots &&
    typeof (data.banners as { slots?: unknown }).slots === "object";
  const hasNewShape =
    data.branding &&
    typeof data.branding === "object" &&
    data.support &&
    typeof data.support === "object" &&
    hasBannerSlots &&
    data.discover &&
    typeof data.discover === "object" &&
    data.features &&
    typeof data.features === "object";

  if (hasNewShape) {
    const incoming = data as unknown as SiteSettings;
    return {
      ...incoming,
      discover: {
        ...incoming.discover,
        hot: mergeHotFromPayload(incoming.discover?.hot)
      }
    };
  }

  // Legacy shape: flatten fields, best-effort map into new config.
  const fallback = ensureDefaultConfig();
  const enableSolanaLogin = Boolean((data as any).enableSolanaLogin);
  const appName = typeof (data as any).appName === "string" ? String((data as any).appName) : fallback.branding.appName;
  const email = typeof (data as any).contactEmail === "string" ? String((data as any).contactEmail) : fallback.support.email;
  const wechat = typeof (data as any).contactWeChat === "string" ? String((data as any).contactWeChat) : fallback.support.wechat;
  const telegram = typeof (data as any).contactTelegram === "string"
    ? String((data as any).contactTelegram)
    : fallback.support.telegram;
  const tags = Array.isArray((data as any).discoverTags)
    ? (data as any).discoverTags.filter((x: unknown) => typeof x === "string")
    : fallback.discover.tags;
  const lounges = Array.isArray((data as any).discoverLounges) ? ((data as any).discoverLounges as any) : fallback.discover.lounges;
  const bannersLegacy = (data as any).banners && typeof (data as any).banners === "object" ? (data as any).banners : null;
  const adsEnabled = Boolean((data as any).adsEnabled);

  const next = ensureDefaultConfig();
  next.features.enableSolanaLogin = enableSolanaLogin;
  next.branding.appName = appName;
  next.support.email = email;
  next.support.wechat = wechat;
  next.support.telegram = telegram;
  next.discover.tags = tags;
  next.discover.lounges = lounges;
  next.discover.hot = ensureDefaultConfig().discover.hot;
  for (const slot of ["chats-top", "contacts-middle", "discover-menu-top", "moments-feed-top"] as const) {
    next.banners.slots[slot].enabled = adsEnabled;
    if (bannersLegacy?.[slot]) {
      next.banners.slots[slot].titleZh = String(bannersLegacy[slot].titleZh ?? "");
      next.banners.slots[slot].titleEn = String(bannersLegacy[slot].titleEn ?? "");
      next.banners.slots[slot].descriptionZh = String(bannersLegacy[slot].descriptionZh ?? "");
      next.banners.slots[slot].descriptionEn = String(bannersLegacy[slot].descriptionEn ?? "");
    }
  }
  return next;
}

export default function AdminPage() {
  const adminTokenStorageKey = "wx_admin_token";
  const defaultAdminToken = "123";
  const [base, setBase] = useState("http://127.0.0.1:4000");
  const [token, setToken] = useState("");
  const [nextToken, setNextToken] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [usingDefaultToken, setUsingDefaultToken] = useState(false);
  const [publicPreview, setPublicPreview] = useState<SiteSettings | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [discoverTagsInput, setDiscoverTagsInput] = useState("");
  const [discoverLoungesInput, setDiscoverLoungesInput] = useState("");
  const [overview, setOverview] = useState<OverviewCounts | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[] | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditQuery, setAuditQuery] = useState<AuditQuery>({
    action: "",
    targetType: "",
    startAt: "",
    endAt: "",
    offset: 0,
    limit: 30
  });
  const [busy, setBusy] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<AdminPanelKey>("security");
  const [auditAdvancedOpen, setAuditAdvancedOpen] = useState(false);
  const autoLoadTriedRef = useRef(false);
  const toastQueueRef = useRef<Array<{ message: string; tone: ToastTone }>>([]);
  const toastTimerRef = useRef<number | null>(null);
  const panelScrollRef = useRef<Record<AdminPanelKey, number>>({
    public: 0,
    security: 0,
    settings: 0,
    ops: 0
  });

  const showNextToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const next = toastQueueRef.current.shift() ?? null;
    setToast(next);
    if (!next) return;
    toastTimerRef.current = window.setTimeout(() => {
      showNextToast();
    }, 2800);
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      toastQueueRef.current.push({ message, tone });
      if (!toast) {
        showNextToast();
      }
    },
    [toast, showNextToast]
  );

  const publicConfigUrl = `${base}/api/public-config`;
  const loungeParse = useMemo(
    () => parseDiscoverLoungesDetailed(discoverLoungesInput),
    [discoverLoungesInput]
  );

  const currentPayloadKey = useMemo(() => {
    if (!settings) return "";
    return JSON.stringify({
      features: settings.features,
      branding: settings.branding,
      support: settings.support,
      discover: {
        ...settings.discover,
        tags: discoverTagsInput
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
        lounges: loungeParse.valid
      },
      banners: settings.banners
    });
  }, [settings, discoverTagsInput, loungeParse.valid]);
  const [lastSavedPayloadKey, setLastSavedPayloadKey] = useState("");
  const isDirty = Boolean(settings) && currentPayloadKey !== lastSavedPayloadKey;
  const auditPage = Math.floor(auditQuery.offset / auditQuery.limit) + 1;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditQuery.limit));

  const switchPanel = useCallback(
    (next: AdminPanelKey) => {
      panelScrollRef.current[activePanel] = window.scrollY;
      setActivePanel(next);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: panelScrollRef.current[next] ?? 0, behavior: "smooth" });
      });
    },
    [activePanel]
  );

  const validationErrors = useMemo(() => {
    if (!settings) return [] as string[];
    const errors: string[] = [];
    if (!isLikelyEmail(settings.support.email)) errors.push("客服邮箱格式不正确");
    if (!isLikelyHexColor(settings.branding.themeColor)) errors.push("主题色需为 Hex（如 #22c55e）");
    if (!isLikelyUrl(settings.branding.logoUrl)) errors.push("Logo URL 不是合法链接");
    if (!isLikelyUrl(settings.support.websiteUrl)) errors.push("官网链接不是合法 URL");
    if (!isLikelyUrl(settings.support.xUrl)) errors.push("X / Twitter 链接不是合法 URL");
    if (!isLikelyUrl(settings.support.discordUrl)) errors.push("Discord 链接不是合法 URL");
    if (loungeParse.invalidLines.length > 0) {
      errors.push(`Lounge 有无效行：第 ${loungeParse.invalidLines.join(", ")} 行（格式：名称|成员数|中文状态|英文状态）`);
    }
    return errors;
  }, [settings, loungeParse.invalidLines]);

  const refreshPublic = useCallback(async () => {
    try {
      const response = await fetch(publicConfigUrl);
      const data = await readJson(response);
      if (!response.ok || data.ok === false) {
        setPublicPreview(null);
        return;
      }
      const coerced = coerceSettingsPayload(data as Record<string, unknown>);
      setPublicPreview(coerced);
    } catch {
      setPublicPreview(null);
    }
  }, [publicConfigUrl]);

  useEffect(() => {
    void refreshPublic();
  }, [refreshPublic]);

  useEffect(() => {
    setBase(webConfig.apiOrigin);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const action = url.searchParams.get("auditAction") ?? "";
    const targetType = url.searchParams.get("auditTargetType") ?? "";
    const startAt = url.searchParams.get("auditStartAt") ?? "";
    const endAt = url.searchParams.get("auditEndAt") ?? "";
    const limit = Number.parseInt(url.searchParams.get("auditLimit") ?? "", 10);
    const offset = Number.parseInt(url.searchParams.get("auditOffset") ?? "", 10);
    setAuditQuery((prev) => ({
      ...prev,
      action,
      targetType,
      startAt,
      endAt,
      limit: Number.isFinite(limit) && limit > 0 ? limit : prev.limit,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : prev.offset
    }));
  }, []);

  useEffect(() => {
    const cached = window.localStorage.getItem(adminTokenStorageKey)?.trim() ?? "";
    if (cached) {
      setToken(cached);
      pushToast("已从本地读取管理密钥，可直接加载管理数据。", "info");
      return;
    }
    setToken(defaultAdminToken);
    pushToast("首次默认管理密钥为 123，请先登录并尽快修改。", "info");
  }, [adminTokenStorageKey, defaultAdminToken, pushToast]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const write = (key: string, value: string | number) => {
      const text = String(value ?? "").trim();
      if (!text || text === "0") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, text);
      }
    };
    write("auditAction", auditQuery.action);
    write("auditTargetType", auditQuery.targetType);
    write("auditStartAt", auditQuery.startAt);
    write("auditEndAt", auditQuery.endAt);
    write("auditLimit", auditQuery.limit);
    write("auditOffset", auditQuery.offset);
    window.history.replaceState({}, "", url.toString());
  }, [auditQuery]);

  const saveToken = useCallback(() => {
    const next = token.trim();
    if (!next) {
      pushToast("请先填写管理密钥", "error");
      return;
    }
    window.localStorage.setItem(adminTokenStorageKey, next);
    pushToast("管理密钥已保存到本地浏览器。", "success");
  }, [adminTokenStorageKey, token]);

  const clearToken = useCallback(() => {
    if (!window.confirm("确认清除本地管理密钥？")) {
      return;
    }
    window.localStorage.removeItem(adminTokenStorageKey);
    setToken("");
    setUsingDefaultToken(false);
    setNextToken("");
    setSettings(null);
    setOverview(null);
    setAuditItems(null);
    setAuditTotal(0);
    pushToast("已清除本地管理密钥。", "info");
  }, [adminTokenStorageKey]);

  const loadAuditLogs = useCallback(
    async (headers: Record<string, string>, nextQuery?: Partial<AuditQuery>) => {
      const merged: AuditQuery = { ...auditQuery, ...(nextQuery ?? {}) };
      const params = new URLSearchParams();
      params.set("limit", String(merged.limit));
      params.set("offset", String(merged.offset));
      if (merged.action.trim()) params.set("action", merged.action.trim());
      if (merged.targetType.trim()) params.set("targetType", merged.targetType.trim());
      if (merged.startAt.trim()) params.set("startAt", new Date(merged.startAt).toISOString());
      if (merged.endAt.trim()) params.set("endAt", new Date(merged.endAt).toISOString());
      const auditRes = await fetch(`${base}/api/admin/audit-logs?${params.toString()}`, { headers });
      const auditData = await readJson(auditRes);
      if (auditRes.ok && auditData.ok !== false && Array.isArray(auditData.items)) {
        setAuditItems(auditData.items as AuditItem[]);
        setAuditTotal(Number((auditData as any).total) || 0);
      } else {
        setAuditItems(null);
        setAuditTotal(0);
      }
      setAuditQuery(merged);
      return { ok: auditRes.ok && auditData.ok !== false, status: auditRes.status };
    },
    [auditQuery, base]
  );

  const loadAdminData = useCallback(async () => {
    if (!token.trim()) {
      pushToast("请先填写管理密钥", "error");
      return;
    }
    window.localStorage.setItem(adminTokenStorageKey, token.trim());
    setBusy(true);
    const headers = { Authorization: `Bearer ${token.trim()}` };
    try {
      const [settingsRes, overviewRes] = await Promise.all([
        fetch(`${base}/api/admin/site-settings`, { headers }),
        fetch(`${base}/api/admin/overview`, { headers })
      ]);

      const settingsData = await readJson(settingsRes);
      if (!settingsRes.ok || settingsData.ok === false) {
        setSettings(null);
        setOverview(null);
        setAuditItems(null);
        pushToast(`加载配置失败：${formatAdminFailure(settingsRes.status, settingsData)}`, "error");
        return;
      }

      const coerced = coerceSettingsPayload(settingsData as Record<string, unknown>) ?? ensureDefaultConfig();
      setSettings(coerced);
      setDiscoverTagsInput(coerced.discover.tags.join(", "));
      setDiscoverLoungesInput(formatDiscoverLounges(coerced.discover.lounges));
      const loadedPayloadKey = JSON.stringify({
        features: coerced.features,
        branding: coerced.branding,
        support: coerced.support,
        discover: {
          ...coerced.discover,
          tags: coerced.discover.tags,
          lounges: coerced.discover.lounges
        },
        banners: coerced.banners
      });
      setLastSavedPayloadKey(loadedPayloadKey);
      setLastSavedAt(
        typeof (settingsData as any).meta?.updatedAt === "string"
          ? String((settingsData as any).meta.updatedAt)
          : null
      );

      const overviewData = await readJson(overviewRes);
      const loadWarnings: string[] = [];
      if (overviewRes.ok && overviewData.ok !== false) {
        setOverview({
          users: Number(overviewData.users) || 0,
          wallets: Number(overviewData.wallets) || 0,
          activeSessions: Number(overviewData.activeSessions) || 0,
          conversations: Number(overviewData.conversations) || 0,
          messages: Number(overviewData.messages) || 0,
          moments: Number(overviewData.moments) || 0,
          friendRequestsPending: Number(overviewData.friendRequestsPending) || 0,
          reports: Number(overviewData.reports) || 0,
          tenantApps: Number(overviewData.tenantApps) || 0,
          auditLogEntries: Number(overviewData.auditLogEntries) || 0
        });
      } else {
        setOverview(null);
        loadWarnings.push(`overview 拉取失败（HTTP ${overviewRes.status}）`);
      }

      const auditResult = await loadAuditLogs(headers, { offset: 0 });
      if (!auditResult.ok) {
        loadWarnings.push(`audit-logs 拉取失败（HTTP ${auditResult.status}）`);
      }

      const authStateRes = await fetch(`${base}/api/admin/auth-state`, { headers });
      const authStateData = await readJson(authStateRes);
      const defaultMode = authStateRes.ok && authStateData.ok !== false ? Boolean(authStateData.usingDefaultToken) : false;
      setUsingDefaultToken(defaultMode);
      const successMessage = defaultMode
        ? "已加载数据。当前仍在使用默认管理密钥 123，请立即修改。"
        : "已加载站点配置与运维数据（含运行概览、审计日志）。";
      pushToast(loadWarnings.length ? `${successMessage} 注意：${loadWarnings.join("；")}` : successMessage, "success");
      await refreshPublic();
    } catch {
      pushToast("加载管理数据失败：网络错误", "error");
      setSettings(null);
      setOverview(null);
      setAuditItems(null);
    } finally {
      setBusy(false);
    }
  }, [adminTokenStorageKey, base, token, refreshPublic, loadAuditLogs]);

  useEffect(() => {
    if (!token.trim() || autoLoadTriedRef.current) return;
    autoLoadTriedRef.current = true;
    void loadAdminData();
  }, [token, loadAdminData]);

  const rotateAdminToken = useCallback(async () => {
    if (!token.trim()) {
      pushToast("请先填写当前管理密钥", "error");
      return;
    }
    if (!nextToken.trim()) {
      pushToast("请填写新的管理密钥", "error");
      return;
    }
    if (!window.confirm("确认更新管理密钥？更新后旧密钥将立即失效。")) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${base}/api/admin/token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: nextToken.trim() })
      });
      const data = await readJson(response);
      if (!response.ok || data.ok === false) {
        pushToast(`更新密钥失败：${formatAdminFailure(response.status, data)}`, "error");
        return;
      }
      const updatedToken = nextToken.trim();
      window.localStorage.setItem(adminTokenStorageKey, updatedToken);
      setToken(updatedToken);
      setNextToken("");
      setUsingDefaultToken(false);
      pushToast("管理密钥已更新并写入本地浏览器，请使用新密钥继续管理。", "success");
    } catch {
      pushToast("更新密钥失败：网络错误", "error");
    } finally {
      setBusy(false);
    }
  }, [adminTokenStorageKey, base, nextToken, token]);

  const saveSettings = useCallback(async () => {
    if (!token.trim() || !settings) {
      pushToast("请先加载配置", "error");
      return;
    }
    if (validationErrors.length > 0) {
      pushToast(`保存前请修正：${validationErrors.join("；")}`, "error");
      return;
    }
    if (!isDirty) {
      pushToast("当前无变更，无需保存。", "info");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${base}/api/admin/site-settings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          features: settings.features,
          branding: settings.branding,
          support: settings.support,
          discover: {
            ...settings.discover,
            tags: discoverTagsInput
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0),
            lounges: loungeParse.valid
          },
          banners: settings.banners
        })
      });
      const data = await readJson(response);
      if (!response.ok || data.ok === false) {
        pushToast(`保存失败：${formatAdminFailure(response.status, data)}`, "error");
        return;
      }
      const next = coerceSettingsPayload(data as Record<string, unknown>) ?? settings;
      setSettings(next);
      setLastSavedPayloadKey(
        JSON.stringify({
          features: next.features,
          branding: next.branding,
          support: next.support,
          discover: {
            ...next.discover,
            tags: discoverTagsInput
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0),
            lounges: loungeParse.valid
          },
          banners: next.banners
        })
      );
      setLastSavedAt(typeof (data as any).meta?.updatedAt === "string" ? String((data as any).meta.updatedAt) : null);
      pushToast("已写入服务端运行时配置，公开配置将在下一次请求时生效。", "success");
      await refreshPublic();
    } catch {
      pushToast("保存失败：网络错误", "error");
    } finally {
      setBusy(false);
    }
  }, [base, token, settings, discoverTagsInput, refreshPublic, loungeParse.valid, validationErrors, isDirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      if (!isSave) return;
      if (activePanel !== "settings") return;
      event.preventDefault();
      void saveSettings();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePanel, saveSettings]);

  const applyAuditFilters = useCallback(async () => {
    if (!token.trim()) {
      pushToast("请先填写管理密钥", "error");
      return;
    }
    setBusy(true);
    try {
      const headers = { Authorization: `Bearer ${token.trim()}` };
      const result = await loadAuditLogs(headers, { offset: 0 });
      if (!result.ok) {
        pushToast(`审计日志筛选失败（HTTP ${result.status}）`, "error");
      } else {
        pushToast("审计日志筛选已更新。", "success");
      }
    } catch {
      pushToast("审计日志筛选失败：网络错误", "error");
    } finally {
      setBusy(false);
    }
  }, [token, loadAuditLogs]);

  const resetAuditFilters = useCallback(async () => {
    setAuditQuery((prev) => ({
      ...prev,
      action: "",
      targetType: "",
      startAt: "",
      endAt: "",
      offset: 0
    }));
    if (!token.trim()) return;
    setBusy(true);
    try {
      const headers = { Authorization: `Bearer ${token.trim()}` };
      await loadAuditLogs(headers, { action: "", targetType: "", startAt: "", endAt: "", offset: 0 });
      pushToast("审计日志筛选已重置。", "success");
    } catch {
      pushToast("重置审计筛选失败：网络错误", "error");
    } finally {
      setBusy(false);
    }
  }, [token, loadAuditLogs]);

  const goAuditPage = useCallback(
    async (nextPage: number) => {
      if (!token.trim()) return;
      const page = Math.min(Math.max(1, nextPage), auditTotalPages);
      setBusy(true);
      try {
        const headers = { Authorization: `Bearer ${token.trim()}` };
        await loadAuditLogs(headers, { offset: (page - 1) * auditQuery.limit });
      } finally {
        setBusy(false);
      }
    },
    [token, auditQuery.limit, auditTotalPages, loadAuditLogs]
  );

  const exportAuditCsv = useCallback(() => {
    if (!auditItems || auditItems.length === 0) {
      pushToast("当前无审计日志可导出。", "info");
      return;
    }
    const escapeCell = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
    const header = ["id", "createdAt", "action", "targetType", "targetId", "actorId", "detail"];
    const lines = [
      header.join(","),
      ...auditItems.map((row) =>
        [
          row.id,
          row.createdAt,
          row.action,
          row.targetType,
          row.targetId,
          row.actorId ?? "",
          row.detail ?? ""
        ]
          .map(escapeCell)
          .join(",")
      )
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-page-${auditPage}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    pushToast("已导出当前页审计日志 CSV。", "success");
  }, [auditItems, auditPage]);

  const applyQuickAuditRange = useCallback((hours: number) => {
    const end = new Date();
    const start = new Date(Date.now() - hours * 60 * 60 * 1000);
    setAuditQuery((prev) => ({
      ...prev,
      startAt: toLocalDateTimeInputValue(start),
      endAt: toLocalDateTimeInputValue(end),
      offset: 0
    }));
  }, []);

  const copyText = useCallback(
    async (value: string, label: string) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        pushToast(`${label}已复制`);
      } catch {
        pushToast(`${label}复制失败`, "error");
      }
    },
    [pushToast]
  );

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 text-slate-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">后台管理</h1>
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/admin/tenant" className="text-slate-700 hover:underline">
            租户应用配置
          </Link>
          <Link href="/" className="text-emerald-700 hover:underline">
            返回应用
          </Link>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["security", "安全与鉴权"],
              ["settings", "站点配置"],
              ["public", "公开配置预览"],
              ["ops", "运维与审计"]
            ] as const
          ).map(([key, label]) => {
            const active = activePanel === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchPanel(key)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  active ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {activePanel === "public" ? (
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">用户端公开配置</h2>
        <p className="mt-2 text-sm text-slate-600">
          主应用通过 <code className="rounded bg-slate-100 px-1">GET /api/public-config</code>{" "}
          拉取下列字段（无需登录）。与构建时{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_*</code> 分工：运行时站点名、广告位、Solana
          开关以此接口为准；WalletConnect Project Id 等仍以构建时环境变量为准。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshPublic()}
            className={BTN_GHOST}
          >
            刷新公开配置
          </button>
          <a
            href={publicConfigUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            在新标签打开 JSON
          </a>
        </div>
        {publicPreview ? (
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <li className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-500">站点名称</span>
              <div className="font-semibold text-slate-900">{publicPreview.branding.appName}</div>
            </li>
            <li className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Solana 登录</span>
              <div className="font-semibold text-slate-900">
                {publicPreview.features.enableSolanaLogin ? "开启" : "关闭"}
              </div>
            </li>
            <li className="rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
              <span className="text-slate-500">Banner 槽位开启数</span>
              <div className="font-semibold text-slate-900">
                {
                  Object.values(publicPreview.banners?.slots ?? {}).filter((slot) => Boolean(slot?.enabled))
                    .length
                }{" "}
                / {Object.keys(publicPreview.banners?.slots ?? {}).length}
              </div>
            </li>
          </ul>
        ) : (
          <p className="mt-3 text-sm text-amber-800">暂时无法拉取公开配置（请确认 API 地址与跨域可用）。</p>
        )}
      </section>
      ) : null}

      {activePanel === "security" ? (
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">管理鉴权</h2>
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">当前状态：</span>
          {usingDefaultToken ? (
            <span className="font-semibold text-amber-700">正在使用默认密钥 123（不安全，建议立即更新）</span>
          ) : (
            <span className="font-semibold text-emerald-700">已使用自定义密钥</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          密钥仅用于请求管理接口，并保存在当前浏览器本地（可随时清除）。
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700">管理密钥</label>
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="与 ADMIN_TOKEN 一致"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={saveToken}
            className={BTN_SECONDARY}
          >
            保存密钥
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={clearToken}
            className={BTN_GHOST}
          >
            清除本地密钥
          </button>
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void loadAdminData()}
            className={BTN_PRIMARY}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <LoadingDot />
                请求中…
              </span>
            ) : token.trim() ? (
              "加载配置与运维数据"
            ) : (
              "请先输入管理密钥"
            )}
          </button>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="block text-sm font-medium text-slate-700">修改管理密钥（首次登录后建议立即修改）</label>
          <input
            type="password"
            autoComplete="new-password"
            value={nextToken}
            onChange={(event) => setNextToken(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="请输入新密钥（至少 4 位）"
          />
          <button
            type="button"
            disabled={busy || !token.trim() || !nextToken.trim()}
            onClick={() => void rotateAdminToken()}
            className={`mt-3 ${BTN_SUCCESS}`}
          >
            更新管理密钥
          </button>
        </div>
      </section>
      ) : null}

      {activePanel === "settings" && settings ? (
        <section className="mb-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">站点配置（可运营）</h2>
          <p className="text-sm text-slate-600">
            这里的配置会通过 <code className="rounded bg-slate-100 px-1">/api/public-config</code> 下发到前端；
            Banner 支持按槽位独立开关；发现页入口卡片支持运营配置。
          </p>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={settings.features.enableSolanaLogin}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, features: { ...previous.features, enableSolanaLogin: event.target.checked } }
                      : previous
                  )
                }
              />
              启用 Solana 登录 / 绑定
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">站点展示名称</label>
            <input
              type="text"
              value={settings.branding.appName}
              onChange={(event) =>
                setSettings((previous) =>
                  previous
                    ? { ...previous, branding: { ...previous.branding, appName: event.target.value } }
                    : previous
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Logo URL（可选）</label>
              <input
                type="text"
                value={settings.branding.logoUrl}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, branding: { ...previous.branding, logoUrl: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">主题色（Hex，例如 #22c55e）</label>
              <input
                type="text"
                value={settings.branding.themeColor}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, branding: { ...previous.branding, themeColor: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">客服邮箱</label>
              <input
                type="text"
                value={settings.support.email}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, support: { ...previous.support, email: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">客服微信</label>
              <input
                type="text"
                value={settings.support.wechat}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, support: { ...previous.support, wechat: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">客服 Telegram</label>
              <input
                type="text"
                value={settings.support.telegram}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, support: { ...previous.support, telegram: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">官网链接（可选）</label>
              <input
                type="text"
                value={settings.support.websiteUrl}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, support: { ...previous.support, websiteUrl: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">X / Twitter 链接（可选）</label>
              <input
                type="text"
                value={settings.support.xUrl}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous ? { ...previous, support: { ...previous.support, xUrl: event.target.value } } : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Discord 链接（可选）</label>
              <input
                type="text"
                value={settings.support.discordUrl}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? { ...previous, support: { ...previous.support, discordUrl: event.target.value } }
                      : previous
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Banner 槽位配置</label>
            <div className="mt-2 grid gap-3">
              {(
                [
                  ["chats-top", "聊天页顶部"],
                  ["contacts-middle", "通讯录中部"],
                  ["discover-menu-top", "发现页顶部"],
                  ["moments-feed-top", "朋友圈顶部"]
                ] as const
              ).map(([slot, label]) => {
                const value = settings.banners.slots[slot];
                return (
                <div key={slot} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {label} <span className="font-mono text-xs text-slate-500">{slot}</span>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={value.enabled}
                          onChange={(event) =>
                            setSettings((previous) => {
                              if (!previous) return previous;
                              return {
                                ...previous,
                                banners: {
                                  slots: {
                                    ...previous.banners.slots,
                                    [slot]: { ...previous.banners.slots[slot], enabled: event.target.checked }
                                  }
                                }
                              };
                            })
                          }
                        />
                        启用
                      </label>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        value={value.titleZh}
                        onChange={(event) =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            return {
                              ...previous,
                              banners: {
                                slots: {
                                  ...previous.banners.slots,
                                  [slot]: { ...previous.banners.slots[slot], titleZh: event.target.value }
                                }
                              }
                            };
                          })
                        }
                        placeholder="标题（中文）"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                      <input
                        value={value.titleEn}
                        onChange={(event) =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            return {
                              ...previous,
                              banners: {
                                slots: {
                                  ...previous.banners.slots,
                                  [slot]: { ...previous.banners.slots[slot], titleEn: event.target.value }
                                }
                              }
                            };
                          })
                        }
                        placeholder="Title (EN)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                      <textarea
                        value={value.descriptionZh}
                        onChange={(event) =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            return {
                              ...previous,
                              banners: {
                                slots: {
                                  ...previous.banners.slots,
                                  [slot]: { ...previous.banners.slots[slot], descriptionZh: event.target.value }
                                }
                              }
                            };
                          })
                        }
                        rows={2}
                        placeholder="描述（中文）"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                      <textarea
                        value={value.descriptionEn}
                        onChange={(event) =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            return {
                              ...previous,
                              banners: {
                                slots: {
                                  ...previous.banners.slots,
                                  [slot]: { ...previous.banners.slots[slot], descriptionEn: event.target.value }
                                }
                              }
                            };
                          })
                        }
                        rows={2}
                        placeholder="Description (EN)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">发现页标签（逗号分隔）</label>
            <input
              type="text"
              value={discoverTagsInput}
              onChange={(event) => setDiscoverTagsInput(event.target.value)}
              placeholder="兴趣圈, Builder, 活动, Mini Apps"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              发现页热门 Lounge（每行：名称|成员数|中文状态|英文状态）
            </label>
            <textarea
              value={discoverLoungesInput}
              onChange={(event) => setDiscoverLoungesInput(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3">
            <div className="text-sm font-semibold text-slate-900">热榜（发现页，数据来自接口 /discover/hot）</div>
            <p className="mt-1 text-xs text-slate-600">
              可配置整块与各子榜是否展示、标题与中英文案、每条榜展示条数（0–20）。排序与分数仍由服务端计算。
            </p>
            <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={settings.discover.hot.enabled}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? {
                          ...previous,
                          discover: {
                            ...previous.discover,
                            hot: { ...previous.discover.hot, enabled: event.target.checked }
                          }
                        }
                      : previous
                  )
                }
              />
              显示「热榜」卡片
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={settings.discover.hot.titleZh}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? {
                          ...previous,
                          discover: {
                            ...previous.discover,
                            hot: { ...previous.discover.hot, titleZh: event.target.value }
                          }
                        }
                      : previous
                  )
                }
                placeholder="主标题（中文），如 热榜"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                value={settings.discover.hot.titleEn}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? {
                          ...previous,
                          discover: {
                            ...previous.discover,
                            hot: { ...previous.discover.hot, titleEn: event.target.value }
                          }
                        }
                      : previous
                  )
                }
                placeholder="Main title (EN)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                value={settings.discover.hot.hintZh}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? {
                          ...previous,
                          discover: {
                            ...previous.discover,
                            hot: { ...previous.discover.hot, hintZh: event.target.value }
                          }
                        }
                      : previous
                  )
                }
                placeholder="角标（中文），如 真实数据"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                value={settings.discover.hot.hintEn}
                onChange={(event) =>
                  setSettings((previous) =>
                    previous
                      ? {
                          ...previous,
                          discover: {
                            ...previous.discover,
                            hot: { ...previous.discover.hot, hintEn: event.target.value }
                          }
                        }
                      : previous
                  )
                }
                placeholder="Hint (EN)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            {(
              [
                ["moments", "热帖（动态）"],
                ["groups", "热群"],
                ["recommendedUsers", "推荐用户"]
              ] as const
            ).map(([key, label]) => {
              const section = settings.discover.hot[key];
              return (
                <div key={key} className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{label}</span>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(event) =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            const hot = coerceHotMasterIfNoSubsections({
                              ...previous.discover.hot,
                              [key]: { ...section, enabled: event.target.checked }
                            });
                            return {
                              ...previous,
                              discover: {
                                ...previous.discover,
                                hot
                              }
                            };
                          })
                        }
                      />
                      显示
                    </label>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <input
                      value={section.titleZh}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          return {
                            ...previous,
                            discover: {
                              ...previous.discover,
                              hot: {
                                ...previous.discover.hot,
                                [key]: { ...section, titleZh: event.target.value }
                              }
                            }
                          };
                        })
                      }
                      placeholder="子标题（中文）"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      value={section.titleEn}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          return {
                            ...previous,
                            discover: {
                              ...previous.discover,
                              hot: {
                                ...previous.discover.hot,
                                [key]: { ...section, titleEn: event.target.value }
                              }
                            }
                          };
                        })
                      }
                      placeholder="Subtitle (EN)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={section.limit}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const v = clampHotLimit(event.target.value, section.limit);
                          return {
                            ...previous,
                            discover: {
                              ...previous.discover,
                              hot: {
                                ...previous.discover.hot,
                                [key]: { ...section, limit: v }
                              }
                            }
                          };
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">发现页入口卡片</label>
            <div className="mt-2 space-y-3">
              {settings.discover.cards.map((card, index) => (
                <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      Card <span className="font-mono text-xs text-slate-500">{card.id}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                        disabled={index === 0}
                        onClick={() =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            const nextCards = [...previous.discover.cards];
                            const item = nextCards.splice(index, 1)[0];
                            nextCards.splice(index - 1, 0, item);
                            return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                          })
                        }
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                        disabled={index === settings.discover.cards.length - 1}
                        onClick={() =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            const nextCards = [...previous.discover.cards];
                            const item = nextCards.splice(index, 1)[0];
                            nextCards.splice(index + 1, 0, item);
                            return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                          })
                        }
                      >
                        下移
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-rose-700"
                        onClick={() =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            if (!window.confirm("确认删除该入口卡片？")) return previous;
                            return {
                              ...previous,
                              discover: {
                                ...previous.discover,
                                cards: previous.discover.cards.filter((_, i) => i !== index)
                              }
                            };
                          })
                        }
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={card.visible}
                        onChange={(event) =>
                          setSettings((previous) => {
                            if (!previous) return previous;
                            const nextCards = [...previous.discover.cards];
                            nextCards[index] = { ...nextCards[index], visible: event.target.checked };
                            return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                          })
                        }
                      />
                      可见
                    </label>
                    <input
                      value={card.titleZh}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const nextCards = [...previous.discover.cards];
                          nextCards[index] = { ...nextCards[index], titleZh: event.target.value };
                          return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                        })
                      }
                      placeholder="标题（中文）"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      value={card.titleEn}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const nextCards = [...previous.discover.cards];
                          nextCards[index] = { ...nextCards[index], titleEn: event.target.value };
                          return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                        })
                      }
                      placeholder="Title (EN)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      value={card.subtitleZh}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const nextCards = [...previous.discover.cards];
                          nextCards[index] = { ...nextCards[index], subtitleZh: event.target.value };
                          return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                        })
                      }
                      placeholder="副标题（中文）"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      value={card.subtitleEn}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const nextCards = [...previous.discover.cards];
                          nextCards[index] = { ...nextCards[index], subtitleEn: event.target.value };
                          return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                        })
                      }
                      placeholder="Subtitle (EN)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <select
                      value={card.action}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const nextCards = [...previous.discover.cards];
                          nextCards[index] = { ...nextCards[index], action: event.target.value as "openMoments" };
                          return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 sm:col-span-2"
                    >
                      <option value="openMoments">打开朋友圈（Moments）</option>
                    </select>
                    <input
                      value={card.id}
                      onChange={(event) =>
                        setSettings((previous) => {
                          if (!previous) return previous;
                          const nextCards = [...previous.discover.cards];
                          nextCards[index] = { ...nextCards[index], id: event.target.value };
                          return { ...previous, discover: { ...previous.discover, cards: nextCards } };
                        })
                      }
                      placeholder="id（用于稳定 key，例如 moments）"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500 sm:col-span-2"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() =>
                  setSettings((previous) => {
                    if (!previous) return previous;
                    const nextId = `card_${Math.random().toString(16).slice(2, 8)}`;
                    return {
                      ...previous,
                      discover: {
                        ...previous.discover,
                        cards: [
                          ...previous.discover.cards,
                          {
                            id: nextId,
                            visible: true,
                            titleZh: "新入口",
                            titleEn: "New entry",
                            subtitleZh: "请配置副标题",
                            subtitleEn: "Configure subtitle",
                            action: "openMoments"
                          }
                        ]
                      }
                    };
                  })
                }
              >
                新增卡片
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={busy || !isDirty || validationErrors.length > 0}
            onClick={() => void saveSettings()}
            className={`w-full ${BTN_SUCCESS}`}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <LoadingDot />
                保存中…
              </span>
            ) : !isDirty ? (
              "暂无变更"
            ) : (
              "保存站点配置"
            )}
          </button>
          {lastSavedAt ? (
            <p className="text-xs text-slate-500">最近保存时间：{new Date(lastSavedAt).toLocaleString()}</p>
          ) : null}
          {validationErrors.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {validationErrors.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          ) : null}
          {loungeParse.invalidLines.length > 0 ? (
            <p className="text-xs text-amber-700">
              Lounge 解析预警：第 {loungeParse.invalidLines.join(", ")} 行格式无效，将不会保存。
            </p>
          ) : null}
        </section>
      ) : null}
      {activePanel === "settings" && !settings ? (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          先在“安全与鉴权”中输入管理密钥并加载数据，才能编辑站点配置。
        </section>
      ) : null}

      {activePanel === "ops" && overview ? (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">运行概览（内存仓储）</h2>
          <p className="mt-1 text-xs text-slate-500">仅反映当前 API 进程内数据，供本地与运维排查使用。</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {(
              [
                ["用户", overview.users],
                ["钱包绑定", overview.wallets],
                ["活跃会话", overview.activeSessions],
                ["会话", overview.conversations],
                ["消息", overview.messages],
                ["朋友圈", overview.moments],
                ["待处理好友请求", overview.friendRequestsPending],
                ["举报", overview.reports],
                ["租户应用", overview.tenantApps],
                ["审计条数", overview.auditLogEntries]
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-lg font-bold tabular-nums text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {activePanel === "ops" && !overview ? (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          请先加载配置与运维数据，再查看概览与审计日志。
        </section>
      ) : null}

      {activePanel === "ops" && auditItems ? (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">审计日志</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuditAdvancedOpen((prev) => !prev)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {auditAdvancedOpen ? "收起高级筛选" : "展开高级筛选"}
              </button>
              <button
                type="button"
                disabled={busy || auditItems.length === 0}
                onClick={exportAuditCsv}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-50"
              >
                导出当前页 CSV
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">支持 action/type/时间筛选、分页查看与当前页导出。</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={auditQuery.action}
              onChange={(event) => setAuditQuery((prev) => ({ ...prev, action: event.target.value }))}
              placeholder="按动作筛选，如 wallet.bound"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              value={auditQuery.targetType}
              onChange={(event) => setAuditQuery((prev) => ({ ...prev, targetType: event.target.value }))}
              placeholder="按类型筛选，如 wallet / user"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          {auditAdvancedOpen ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={auditQuery.startAt}
                onChange={(event) => setAuditQuery((prev) => ({ ...prev, startAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="datetime-local"
                value={auditQuery.endAt}
                onChange={(event) => setAuditQuery((prev) => ({ ...prev, endAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyQuickAuditRange(1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              最近1小时
            </button>
            <button
              type="button"
              onClick={() => applyQuickAuditRange(24)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              最近24小时
            </button>
            <button
              type="button"
              onClick={() => applyQuickAuditRange(24 * 7)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              最近7天
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyAuditFilters()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingDot />
                  应用中…
                </span>
              ) : (
                "应用筛选"
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resetAuditFilters()}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              重置筛选
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            总计 {auditTotal} 条，当前第 {auditPage} / {auditTotalPages} 页
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2 font-medium">时间</th>
                  <th className="py-2 pr-2 font-medium">动作</th>
                  <th className="py-2 pr-2 font-medium">类型</th>
                  <th className="py-2 pr-2 font-medium">目标</th>
                  <th className="py-2 font-medium">详情</th>
                </tr>
              </thead>
              <tbody>
                {auditItems.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-mono text-slate-600">{row.createdAt}</td>
                    <td className="py-2 pr-2">{row.action}</td>
                    <td className="py-2 pr-2">{row.targetType}</td>
                    <td className="max-w-[160px] truncate py-2 pr-2 font-mono" title={row.targetId}>
                      <button
                        type="button"
                        onClick={() => void copyText(row.targetId, "目标ID")}
                        className="truncate text-left text-slate-700 underline-offset-2 hover:underline"
                      >
                        {row.targetId}
                      </button>
                    </td>
                    <td className="max-w-[220px] truncate py-2 text-slate-600" title={row.detail ?? ""}>
                      {row.detail ? (
                        <button
                          type="button"
                          onClick={() => void copyText(row.detail ?? "", "详情")}
                          className="truncate text-left underline-offset-2 hover:underline"
                        >
                          {row.detail}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={busy || auditPage <= 1}
              onClick={() => void goAuditPage(auditPage - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={busy || auditPage >= auditTotalPages}
              onClick={() => void goAuditPage(auditPage + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </section>
      ) : null}

      {activePanel === "ops" && auditItems && auditItems.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">当前无审计记录（或尚未产生写操作）。</p>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg ${
            toast.tone === "success"
              ? "bg-emerald-600"
              : toast.tone === "error"
                ? "bg-rose-600"
                : "bg-slate-900"
          }`}
        >
          {toast.message}
          <button
            type="button"
            onClick={() => showNextToast()}
            className="ml-3 text-white/80 hover:text-white"
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  );
}
