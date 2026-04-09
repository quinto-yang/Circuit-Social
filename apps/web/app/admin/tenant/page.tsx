 "use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TenantAppsAdminPanel } from "@/components/tenant-apps-admin-panel";

export default function AdminTenantPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cachedToken = window.localStorage.getItem("wx_admin_token")?.trim() ?? "";
    if (!cachedToken) {
      router.replace("/admin");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 text-slate-900">
        <p className="text-sm text-slate-600">正在检查管理密钥配置...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 text-slate-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">租户应用配置</h1>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/admin" className="text-emerald-700 hover:underline">
            站点管理
          </Link>
          <Link href="/" className="text-slate-600 hover:underline">
            返回应用
          </Link>
        </div>
      </div>

      <p className="mb-8 text-sm text-slate-600">
        租户 API 使用与主应用相同的登录会话（Cookie）。请先在首页完成钱包登录，再在本页管理应用、域名白名单与密钥。
      </p>

      <TenantAppsAdminPanel />
    </main>
  );
}
