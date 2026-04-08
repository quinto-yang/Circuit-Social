import { ApiError } from "./api";
import { webConfig } from "./config";

export const AUTH_ERROR_CODES = {
  UNKNOWN_API_ERROR: "UNKNOWN_API_ERROR",
  CHAIN_NOT_SUPPORTED: "CHAIN_NOT_SUPPORTED",
  WALLET_ADDRESS_INVALID: "WALLET_ADDRESS_INVALID",
  CHAIN_TYPE_UNSUPPORTED: "CHAIN_TYPE_UNSUPPORTED",
  NONCE_INVALID_OR_EXPIRED: "NONCE_INVALID_OR_EXPIRED",
  SIGN_INTENT_MISMATCH: "SIGN_INTENT_MISMATCH",
  NONCE_EXPIRED: "NONCE_EXPIRED",
  SIWE_VERIFY_FAILED: "SIWE_VERIFY_FAILED",
  SOLANA_VERIFY_FAILED: "SOLANA_VERIFY_FAILED",
  SIGNER_ADDRESS_MISMATCH: "SIGNER_ADDRESS_MISMATCH",
  SIGNER_CHAIN_ID_MISMATCH: "SIGNER_CHAIN_ID_MISMATCH",
  SOLANA_NOT_READY: "SOLANA_NOT_READY",
  SOLANA_INVALID_PAYLOAD: "SOLANA_INVALID_PAYLOAD"
} as const;

export function mapApiError(error: unknown, fallback = "请求失败") {
  const message = error instanceof Error ? error.message : fallback;
  const code = error instanceof ApiError ? error.code ?? "" : "";
  const status = error instanceof ApiError ? error.status : undefined;

  if (code === AUTH_ERROR_CODES.UNKNOWN_API_ERROR) {
    return fallback;
  }

  if (code === AUTH_ERROR_CODES.SOLANA_NOT_READY) {
    if (!webConfig.enableSolanaLogin) {
      return "Solana 登录灰度未开启，请先使用 EVM 钱包登录（或将 NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true 后重启 Web）。";
    }
    return "Solana 登录/绑定即将支持，目前暂不可用，请先使用 EVM 钱包。";
  }

  if (code === AUTH_ERROR_CODES.SOLANA_INVALID_PAYLOAD) {
    return "Solana 登录参数无效（签名/消息格式不正确），请重试或先使用 EVM 钱包。";
  }

  if (code === AUTH_ERROR_CODES.SOLANA_VERIFY_FAILED) {
    return "Solana 签名验证失败，请确认钱包账户后重试。";
  }

  if (code === AUTH_ERROR_CODES.CHAIN_NOT_SUPPORTED) {
    return "当前链暂不支持，请切换到受支持网络后重试。";
  }

  if (code === AUTH_ERROR_CODES.WALLET_ADDRESS_INVALID) {
    return "钱包地址格式无效，请检查后重试。";
  }

  if (code === AUTH_ERROR_CODES.CHAIN_TYPE_UNSUPPORTED) {
    return "暂不支持该链类型，请先使用 EVM 钱包。";
  }

  if (code === AUTH_ERROR_CODES.NONCE_INVALID_OR_EXPIRED || code === AUTH_ERROR_CODES.NONCE_EXPIRED) {
    return "登录挑战已失效，请重新发起签名。";
  }

  if (code === AUTH_ERROR_CODES.SIGN_INTENT_MISMATCH) {
    return "签名用途不匹配，请重新发起当前操作。";
  }

  if (code === AUTH_ERROR_CODES.SIWE_VERIFY_FAILED) {
    return "签名验证失败，请确认钱包账户与域名后重试。";
  }

  if (code === AUTH_ERROR_CODES.SIGNER_ADDRESS_MISMATCH) {
    return "签名地址与当前钱包不一致，请切换钱包后重试。";
  }

  if (code === AUTH_ERROR_CODES.SIGNER_CHAIN_ID_MISMATCH) {
    return "签名链 ID 与当前网络不一致，请切换网络后重试。";
  }

  if (status === 0) {
    return "网络连接异常，请检查网络后重试。";
  }

  if (status === 401) {
    return "登录状态已失效，请重新登录后重试。";
  }

  if (status === 403) {
    return "当前操作无权限，请确认账号权限后重试。";
  }

  if (status === 404) {
    return "请求资源不存在，可能已被删除或移动。";
  }

  if (typeof status === "number" && status >= 500) {
    return "服务暂时不可用，请稍后重试。";
  }

  return message;
}

