import { webConfig } from "./config";

type ErrorPayload = { ok?: boolean; error?: string; errorCode?: string } | null;
const UNKNOWN_API_ERROR = "UNKNOWN_API_ERROR";

/** 避免初始化时 fetch 无限挂起导致首页一直 Loading（见 AppShell session === undefined） */
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  code?: string;
  status?: number;
  path?: string;

  constructor(input: { message: string; code?: string; status?: number; path?: string }) {
    super(input.message);
    this.name = "ApiError";
    this.code = input.code;
    this.status = input.status;
    this.path = input.path;
  }
}

function buildApiError(input: {
  data: ErrorPayload;
  fallbackMessage: string;
  status?: number;
  path: string;
}) {
  return new ApiError({
    message: input.data?.error ?? input.fallbackMessage,
    code: input.data?.errorCode ?? UNKNOWN_API_ERROR,
    status: input.status,
    path: input.path
  });
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const { timeoutMs: _timeout, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${webConfig.apiOrigin}/api${path}`, {
      ...fetchInit,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...(fetchInit?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(fetchInit?.headers ?? {})
      }
    });

    const data = (await response.json().catch(() => null)) as ErrorPayload;

    if (!response.ok || data?.ok === false) {
      throw buildApiError({
        data,
        fallbackMessage: "请求失败",
        status: response.status,
        path
      });
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError({
        message: `连接后端超时（${timeoutMs / 1000}s），请确认 API 已启动且 NEXT_PUBLIC_API_ORIGIN 正确（默认 http://localhost:4000）`,
        code: "REQUEST_TIMEOUT",
        path
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body:
        body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined
    });
  },
  postWithProgress<T>(
    path: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ) {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${webConfig.apiOrigin}/api${path}`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onerror = () =>
        reject(
          new ApiError({
            message: "网络异常",
            status: 0,
            path
          })
        );
      xhr.onload = () => {
        const data = (() => {
          try {
            return JSON.parse(xhr.responseText || "null") as ErrorPayload;
          } catch {
            return null;
          }
        })();
        if (xhr.status >= 200 && xhr.status < 300 && data?.ok !== false) {
          resolve(data as T);
          return;
        }
        reject(
          buildApiError({
            data,
            fallbackMessage: "请求失败",
            status: xhr.status,
            path
          })
        );
      };

      xhr.send(formData);
    });
  },
  delete<T>(path: string) {
    return request<T>(path, {
      method: "DELETE"
    });
  }
};
