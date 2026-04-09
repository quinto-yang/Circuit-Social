import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { SessionUserPayload, WalletAccount } from "@/lib/types";

type ProfileForm = {
  nickname: string;
  bio: string;
  avatarUrl: string;
  didUri: string;
  primaryWalletId: number;
};

type UseProfileActionsArgs = {
  profileForm: ProfileForm;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setSession: Dispatch<SetStateAction<SessionUserPayload | null | undefined>>;
  setModal: Dispatch<SetStateAction<any>>;
  setProfileAvatarUrlManual: Dispatch<SetStateAction<boolean>>;
  flashStatus: (message: string, durationMs?: number) => void;
  setStatus: Dispatch<SetStateAction<string>>;
  t: (zh: string, en: string) => string;
};

export function useProfileActions({
  profileForm,
  setBusy,
  setSession,
  setModal,
  setProfileAvatarUrlManual,
  flashStatus,
  setStatus,
  t
}: UseProfileActionsArgs) {
  const saveProfile = useCallback(async () => {
    if (!profileForm.nickname.trim()) return;
    setBusy("profile");
    try {
      const result = await api.post<{
        user: SessionUserPayload["user"] & { wallets: WalletAccount[] };
        didStatus?: SessionUserPayload["didStatus"];
      }>("/profile", {
        nickname: profileForm.nickname.trim(),
        bio: profileForm.bio.trim(),
        avatarUrl: profileForm.avatarUrl.trim() || null,
        didUri: profileForm.didUri.trim() || null,
        primaryWalletId: profileForm.primaryWalletId
      });
      setSession({
        user: {
          id: result.user.id,
          nickname: result.user.nickname,
          bio: result.user.bio,
          avatarUrl: result.user.avatarUrl,
          didUri: result.user.didUri,
          encryptionPublicKey: result.user.encryptionPublicKey,
          primaryWalletAddress: result.user.primaryWalletAddress,
          primaryChainId: result.user.primaryChainId,
          primaryChainLabel: result.user.primaryChainLabel
        },
        wallets: result.user.wallets,
        didStatus: result.didStatus
      });
      setModal(null);
      setProfileAvatarUrlManual(false);
      flashStatus(t("资料已更新", "Profile updated"));
    } catch (error) {
      setStatus(mapApiError(error, "保存失败"));
    } finally {
      setBusy(null);
    }
  }, [
    flashStatus,
    profileForm.avatarUrl,
    profileForm.bio,
    profileForm.didUri,
    profileForm.nickname,
    profileForm.primaryWalletId,
    setBusy,
    setModal,
    setProfileAvatarUrlManual,
    setSession,
    setStatus,
    t
  ]);

  return { saveProfile };
}

