import { useEffect } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { SessionUserPayload } from "@/lib/types";

type UseAppBootstrapArgs<TSitePublicConfig> = {
  hydrateSession: () => Promise<void>;
  setStatus: (message: string) => void;
  setSession: (value: SessionUserPayload | null) => void;
  setSitePublic: (value: TSitePublicConfig) => void;
  coerceSitePublic: (raw: Record<string, unknown> | null) => TSitePublicConfig;
  session: SessionUserPayload | null | undefined;
  shouldLoadDiscoverHot: boolean;
  loadConversations: () => Promise<void>;
  loadContacts: () => Promise<void>;
  loadMoments: () => Promise<void>;
  loadPointsAndTasks: () => Promise<void>;
  loadDiscoverHot: () => Promise<void>;
};

export function useAppBootstrap<TSitePublicConfig>({
  hydrateSession,
  setStatus,
  setSession,
  setSitePublic,
  coerceSitePublic,
  session,
  shouldLoadDiscoverHot,
  loadConversations,
  loadContacts,
  loadMoments,
  loadPointsAndTasks,
  loadDiscoverHot
}: UseAppBootstrapArgs<TSitePublicConfig>) {
  useEffect(() => {
    const boot = async () => {
      try {
        setStatus("");
        const [, publicResult] = await Promise.all([
          hydrateSession(),
          api.get<Record<string, unknown>>("/public-config").catch(() => null)
        ]);
        if (publicResult) {
          setSitePublic(coerceSitePublic(publicResult));
        }
      } catch (error) {
        setStatus(mapApiError(error, "初始化失败"));
        setSession(null);
      }
    };
    void boot();
  }, [coerceSitePublic, hydrateSession, setSession, setSitePublic, setStatus]);

  useEffect(() => {
    if (!session) return;
    const parallel = [loadConversations(), loadContacts(), loadMoments(), loadPointsAndTasks()];
    if (shouldLoadDiscoverHot) {
      parallel.push(loadDiscoverHot());
    }
    void Promise.all(parallel);
  }, [
    session,
    shouldLoadDiscoverHot,
    loadConversations,
    loadContacts,
    loadMoments,
    loadPointsAndTasks,
    loadDiscoverHot
  ]);
}

