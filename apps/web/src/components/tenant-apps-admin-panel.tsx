"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";

export type TenantAppConfig = {
  id: number;
  ownerUserId: number;
  name: string;
  chainPolicy: Array<"evm" | "solana">;
  callbackUrl: string | null;
  createdAt: string;
  updatedAt: string;
  domains: Array<{ id: number; appId: number; domain: string; createdAt: string }>;
  keys: Array<{
    id: number;
    appId: number;
    keyId: string;
    status: "active" | "rotated";
    lastRotatedAt: string | null;
    createdAt: string;
  }>;
  branding: {
    appId: number;
    logoUrl: string | null;
    themeColor: string | null;
    displayName: string | null;
    updatedAt: string;
  } | null;
};

function AdminInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white"
    />
  );
}

function AdminLabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      {children}
    </label>
  );
}

export function TenantAppsAdminPanel() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [tenantApps, setTenantApps] = useState<TenantAppConfig[]>([]);
  const [tenantAppName, setTenantAppName] = useState("");
  const [tenantCallbackUrl, setTenantCallbackUrl] = useState("");
  const [tenantChainPolicy, setTenantChainPolicy] = useState<Array<"evm" | "solana">>(["evm"]);
  const [tenantDomainDraft, setTenantDomainDraft] = useState<Record<number, string>>({});
  const [tenantEditName, setTenantEditName] = useState<Record<number, string>>({});
  const [tenantEditCallback, setTenantEditCallback] = useState<Record<number, string>>({});
  const [tenantEditChainPolicy, setTenantEditChainPolicy] = useState<
    Record<number, Array<"evm" | "solana">>
  >({});
  const [tenantEditBrandName, setTenantEditBrandName] = useState<Record<number, string>>({});
  const [tenantEditBrandTheme, setTenantEditBrandTheme] = useState<Record<number, string>>({});
  const [tenantEditBrandLogo, setTenantEditBrandLogo] = useState<Record<number, string>>({});
  const [tenantFilterKeyword, setTenantFilterKeyword] = useState("");
  const [tenantFilterChain, setTenantFilterChain] = useState<"all" | "evm" | "solana">("all");

  const loadTenantApps = useCallback(async () => {
    const result = await api.get<{ apps: TenantAppConfig[] }>("/tenant/apps");
    setTenantApps(result.apps);
    setTenantEditName(
      Object.fromEntries(result.apps.map((app) => [app.id, app.name])) as Record<number, string>
    );
    setTenantEditCallback(
      Object.fromEntries(result.apps.map((app) => [app.id, app.callbackUrl ?? ""])) as Record<
        number,
        string
      >
    );
    setTenantEditChainPolicy(
      Object.fromEntries(result.apps.map((app) => [app.id, app.chainPolicy])) as Record<
        number,
        Array<"evm" | "solana">
      >
    );
    setTenantEditBrandName(
      Object.fromEntries(result.apps.map((app) => [app.id, app.branding?.displayName ?? ""])) as Record<
        number,
        string
      >
    );
    setTenantEditBrandTheme(
      Object.fromEntries(result.apps.map((app) => [app.id, app.branding?.themeColor ?? ""])) as Record<
        number,
        string
      >
    );
    setTenantEditBrandLogo(
      Object.fromEntries(result.apps.map((app) => [app.id, app.branding?.logoUrl ?? ""])) as Record<
        number,
        string
      >
    );
  }, []);

  useEffect(() => {
    void loadTenantApps().catch((error: unknown) => {
      setStatus(mapApiError(error, "加载租户应用失败（请先在本站首页登录）"));
    });
  }, [loadTenantApps]);

  async function createTenantApp() {
    if (!tenantAppName.trim()) return;
    setBusy("tenant-create");
    setStatus("");
    try {
      await api.post("/tenant/apps", {
        name: tenantAppName.trim(),
        chainPolicy: tenantChainPolicy,
        callbackUrl: tenantCallbackUrl.trim() || null
      });
      setTenantAppName("");
      setTenantCallbackUrl("");
      setTenantChainPolicy(["evm"]);
      await loadTenantApps();
      setStatus("应用创建成功");
    } catch (error) {
      setStatus(mapApiError(error, "创建应用失败"));
    } finally {
      setBusy(null);
    }
  }

  async function addTenantDomain(appId: number) {
    const domain = tenantDomainDraft[appId]?.trim();
    if (!domain) return;
    setBusy(`tenant-domain-${appId}`);
    setStatus("");
    try {
      await api.post(`/tenant/apps/${appId}/domains`, { domain });
      setTenantDomainDraft((previous) => ({ ...previous, [appId]: "" }));
      await loadTenantApps();
      setStatus("域名已添加");
    } catch (error) {
      setStatus(mapApiError(error, "添加域名失败"));
    } finally {
      setBusy(null);
    }
  }

  async function updateTenantApp(appId: number) {
    setBusy(`tenant-update-${appId}`);
    setStatus("");
    try {
      await api.post(`/tenant/apps/${appId}`, {
        name: tenantEditName[appId]?.trim(),
        chainPolicy: tenantEditChainPolicy[appId],
        callbackUrl: tenantEditCallback[appId]?.trim() || null
      });
      await loadTenantApps();
      setStatus("应用配置已更新");
    } catch (error) {
      setStatus(mapApiError(error, "更新应用失败"));
    } finally {
      setBusy(null);
    }
  }

  async function updateTenantBranding(appId: number) {
    setBusy(`tenant-branding-${appId}`);
    setStatus("");
    try {
      await api.post(`/tenant/apps/${appId}/branding`, {
        displayName: tenantEditBrandName[appId]?.trim() || null,
        themeColor: tenantEditBrandTheme[appId]?.trim() || null,
        logoUrl: tenantEditBrandLogo[appId]?.trim() || null
      });
      await loadTenantApps();
      setStatus("品牌配置已更新");
    } catch (error) {
      setStatus(mapApiError(error, "更新品牌配置失败"));
    } finally {
      setBusy(null);
    }
  }

  async function rotateTenantKey(appId: number) {
    setBusy(`tenant-rotate-key-${appId}`);
    setStatus("");
    try {
      await api.post(`/tenant/apps/${appId}/keys/rotate`);
      await loadTenantApps();
      setStatus("已轮换应用密钥");
    } catch (error) {
      setStatus(mapApiError(error, "轮换密钥失败"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {status ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {status}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">创建应用</h2>
        <p className="mt-1 text-sm text-slate-600">新建租户应用并配置链策略与回调。</p>
        <div className="mt-4 space-y-3">
          <AdminLabeledField label="应用名称">
            <AdminInput
              value={tenantAppName}
              onChange={setTenantAppName}
              placeholder="例如 Circuit Demo"
            />
          </AdminLabeledField>
          <AdminLabeledField label="回调地址（可选）">
            <AdminInput
              value={tenantCallbackUrl}
              onChange={setTenantCallbackUrl}
              placeholder="https://demo.example.com/callback"
            />
          </AdminLabeledField>
          <AdminLabeledField label="链策略">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tenantChainPolicy.includes("evm")}
                  onChange={(event) =>
                    setTenantChainPolicy((previous) =>
                      event.target.checked
                        ? Array.from(new Set([...previous, "evm"]))
                        : previous.filter((item) => item !== "evm")
                    )
                  }
                />
                EVM
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tenantChainPolicy.includes("solana")}
                  onChange={(event) =>
                    setTenantChainPolicy((previous) =>
                      event.target.checked
                        ? Array.from(new Set([...previous, "solana"]))
                        : previous.filter((item) => item !== "solana")
                    )
                  }
                />
                Solana
              </label>
            </div>
          </AdminLabeledField>
          <button
            type="button"
            onClick={() => void createTenantApp()}
            disabled={busy === "tenant-create" || !tenantAppName.trim()}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {busy === "tenant-create" ? "创建中..." : "创建应用"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">应用列表</h2>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <AdminInput
            value={tenantFilterKeyword}
            onChange={setTenantFilterKeyword}
            placeholder="筛选应用名"
          />
          <select
            value={tenantFilterChain}
            onChange={(event) =>
              setTenantFilterChain(event.target.value as "all" | "evm" | "solana")
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
          >
            <option value="all">全部链</option>
            <option value="evm">EVM</option>
            <option value="solana">Solana</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {tenantApps
            .filter((app) => {
              const keyword = tenantFilterKeyword.trim().toLowerCase();
              const keywordMatched = keyword ? app.name.toLowerCase().includes(keyword) : true;
              const chainMatched =
                tenantFilterChain === "all" ? true : app.chainPolicy.includes(tenantFilterChain);
              return keywordMatched && chainMatched;
            })
            .map((app) => (
              <div key={app.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <AdminInput
                  value={tenantEditName[app.id] ?? app.name}
                  onChange={(value) =>
                    setTenantEditName((previous) => ({ ...previous, [app.id]: value }))
                  }
                  placeholder="应用名称"
                />
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={(tenantEditChainPolicy[app.id] ?? app.chainPolicy).includes("evm")}
                      onChange={(event) =>
                        setTenantEditChainPolicy((previous) => {
                          const next = previous[app.id] ?? app.chainPolicy;
                          return {
                            ...previous,
                            [app.id]: event.target.checked
                              ? Array.from(new Set([...next, "evm"]))
                              : next.filter((item) => item !== "evm")
                          };
                        })
                      }
                    />
                    EVM
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={(tenantEditChainPolicy[app.id] ?? app.chainPolicy).includes("solana")}
                      onChange={(event) =>
                        setTenantEditChainPolicy((previous) => {
                          const next = previous[app.id] ?? app.chainPolicy;
                          return {
                            ...previous,
                            [app.id]: event.target.checked
                              ? Array.from(new Set([...next, "solana"]))
                              : next.filter((item) => item !== "solana")
                          };
                        })
                      }
                    />
                    Solana
                  </label>
                </div>
                <div className="mt-2 flex gap-2">
                  <AdminInput
                    value={tenantEditCallback[app.id] ?? app.callbackUrl ?? ""}
                    onChange={(value) =>
                      setTenantEditCallback((previous) => ({ ...previous, [app.id]: value }))
                    }
                    placeholder="回调地址（可选）"
                  />
                  <button
                    type="button"
                    onClick={() => void updateTenantApp(app.id)}
                    disabled={busy === `tenant-update-${app.id}`}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {busy === `tenant-update-${app.id}` ? "保存中..." : "保存"}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <AdminInput
                    value={tenantDomainDraft[app.id] ?? ""}
                    onChange={(value) =>
                      setTenantDomainDraft((previous) => ({ ...previous, [app.id]: value }))
                    }
                    placeholder="新增域名，例如 app.example.com"
                  />
                  <button
                    type="button"
                    onClick={() => void addTenantDomain(app.id)}
                    disabled={busy === `tenant-domain-${app.id}`}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {busy === `tenant-domain-${app.id}` ? "添加中..." : "添加"}
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  域名白名单：
                  {app.domains.length ? app.domains.map((item) => item.domain).join(", ") : "暂无"}
                </div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                  <div className="text-[11px] font-medium text-slate-500">租户密钥</div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {app.keys.map((item) => `${item.keyId.slice(0, 10)}...(${item.status})`).join(", ")}
                  </div>
                  <button
                    type="button"
                    onClick={() => void rotateTenantKey(app.id)}
                    disabled={busy === `tenant-rotate-key-${app.id}`}
                    className="mt-2 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700"
                  >
                    {busy === `tenant-rotate-key-${app.id}` ? "轮换中..." : "轮换密钥"}
                  </button>
                </div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                  <div className="text-[11px] font-medium text-slate-500">品牌配置</div>
                  <div className="mt-2 space-y-2">
                    <AdminInput
                      value={tenantEditBrandName[app.id] ?? ""}
                      onChange={(value) =>
                        setTenantEditBrandName((previous) => ({ ...previous, [app.id]: value }))
                      }
                      placeholder="品牌展示名（可选）"
                    />
                    <AdminInput
                      value={tenantEditBrandTheme[app.id] ?? ""}
                      onChange={(value) =>
                        setTenantEditBrandTheme((previous) => ({ ...previous, [app.id]: value }))
                      }
                      placeholder="主题色，例如 #22c55e"
                    />
                    <AdminInput
                      value={tenantEditBrandLogo[app.id] ?? ""}
                      onChange={(value) =>
                        setTenantEditBrandLogo((previous) => ({ ...previous, [app.id]: value }))
                      }
                      placeholder="Logo URL（可选）"
                    />
                    <button
                      type="button"
                      onClick={() => void updateTenantBranding(app.id)}
                      disabled={busy === `tenant-branding-${app.id}`}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700"
                    >
                      {busy === `tenant-branding-${app.id}` ? "保存中..." : "保存品牌配置"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {!tenantApps.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              暂无应用，请先创建你的第一个租户应用。
            </div>
          ) : null}
          {tenantApps.length > 0 &&
          !tenantApps.some((app) => {
            const keyword = tenantFilterKeyword.trim().toLowerCase();
            const keywordMatched = keyword ? app.name.toLowerCase().includes(keyword) : true;
            const chainMatched =
              tenantFilterChain === "all" ? true : app.chainPolicy.includes(tenantFilterChain);
            return keywordMatched && chainMatched;
          }) ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              暂无符合筛选条件的应用。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
