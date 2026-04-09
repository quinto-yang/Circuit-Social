import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { MomentView, UploadAsset } from "@/lib/types";

type MomentUploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  uploadId: number | null;
};

type UseMomentActionsArgs = {
  momentDraft: string;
  momentFiles: MomentUploadItem[];
  setBusy: Dispatch<SetStateAction<string | null>>;
  setMomentNotice: Dispatch<SetStateAction<string>>;
  setMomentDraft: Dispatch<SetStateAction<string>>;
  setMomentFiles: Dispatch<SetStateAction<MomentUploadItem[]>>;
  mergeMoment: (moment: MomentView) => void;
  setStatus: Dispatch<SetStateAction<string>>;
};

export function useMomentActions({
  momentDraft,
  momentFiles,
  setBusy,
  setMomentNotice,
  setMomentDraft,
  setMomentFiles,
  mergeMoment,
  setStatus
}: UseMomentActionsArgs) {
  const enqueueMomentUploads = useCallback(
    (files: File[]) => {
      const allowed = files.slice(0, Math.max(0, 9 - momentFiles.length));
      allowed.forEach((file) => {
        const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const formData = new FormData();
        formData.append("file", file);
        setMomentFiles((previous) => [
          ...previous,
          { id: localId, file, progress: 0, status: "uploading", uploadId: null }
        ]);
        void api
          .postWithProgress<{ upload: UploadAsset }>("/uploads/image", formData, (progress) => {
            setMomentFiles((previous) =>
              previous.map((item) =>
                item.id === localId ? { ...item, progress, status: "uploading" } : item
              )
            );
          })
          .then((result) => {
            setMomentFiles((previous) =>
              previous.map((item) =>
                item.id === localId
                  ? { ...item, progress: 100, status: "done", uploadId: result.upload.id }
                  : item
              )
            );
          })
          .catch(() => {
            setMomentFiles((previous) =>
              previous.map((item) => (item.id === localId ? { ...item, status: "error" } : item))
            );
          });
      });
    },
    [momentFiles.length, setMomentFiles]
  );

  const publishMoment = useCallback(async () => {
    if (!momentDraft.trim() && momentFiles.length === 0) return;
    setBusy("publish-moment");
    setMomentNotice("");
    try {
      const uploadingCount = momentFiles.filter((item) => item.status === "uploading").length;
      if (uploadingCount > 0) {
        setMomentNotice(`还有 ${uploadingCount} 张图片上传中，请稍候`);
        setBusy(null);
        return;
      }
      const uploadIds = momentFiles
        .filter((item) => item.status === "done" && item.uploadId)
        .map((item) => item.uploadId as number);
      const result = await api.post<{ moment: MomentView }>("/moments", {
        content: momentDraft.trim(),
        uploadIds
      });
      setMomentDraft("");
      setMomentFiles([]);
      mergeMoment(result.moment);
      setMomentNotice("已发布到朋友圈");
      setStatus("动态已发布");
    } catch (error) {
      const message = mapApiError(error, "发布失败");
      setMomentNotice(message);
      setStatus(message);
    } finally {
      setBusy(null);
    }
  }, [
    mergeMoment,
    momentDraft,
    momentFiles,
    setBusy,
    setMomentDraft,
    setMomentFiles,
    setMomentNotice,
    setStatus
  ]);

  return { enqueueMomentUploads, publishMoment };
}

