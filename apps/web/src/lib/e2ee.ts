import nacl from "tweetnacl";

type EncryptedPayload = {
  v: 1;
  senderPublicKey: string;
  boxes: Record<string, { nonce: string; cipher: string }>;
};

const PREFIX = "e2ee:";
const KEY_STORAGE = "cx:e2ee:keypair:v1";

function toBase64(value: Uint8Array) {
  if (typeof window === "undefined") return "";
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function fromBase64(value: string) {
  if (typeof window === "undefined") return new Uint8Array();
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function ensureLocalKeyPair() {
  if (typeof window === "undefined") return null;
  const cached = window.localStorage.getItem(KEY_STORAGE);
  if (cached) {
    return JSON.parse(cached) as { publicKey: string; secretKey: string };
  }
  const pair = nacl.box.keyPair();
  const value = {
    publicKey: toBase64(pair.publicKey),
    secretKey: toBase64(pair.secretKey)
  };
  window.localStorage.setItem(KEY_STORAGE, JSON.stringify(value));
  return value;
}

export function encryptForParticipants(input: {
  plainText: string;
  senderSecretKey: string;
  senderPublicKey: string;
  recipients: Array<{ userId: number; encryptionPublicKey: string | null }>;
}) {
  const secretKey = fromBase64(input.senderSecretKey);
  const boxes: EncryptedPayload["boxes"] = {};
  for (const recipient of input.recipients) {
    if (!recipient.encryptionPublicKey) {
      throw new Error(`用户 ${recipient.userId} 尚未初始化加密密钥`);
    }
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const cipher = nacl.box(
      new TextEncoder().encode(input.plainText),
      nonce,
      fromBase64(recipient.encryptionPublicKey),
      secretKey
    );
    boxes[String(recipient.userId)] = {
      nonce: toBase64(nonce),
      cipher: toBase64(cipher)
    };
  }
  const payload: EncryptedPayload = {
    v: 1,
    senderPublicKey: input.senderPublicKey,
    boxes
  };
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function decryptContent(input: {
  content: string;
  currentUserId: number;
  secretKey: string | null;
}) {
  if (!input.content.startsWith(PREFIX)) return input.content;
  if (!input.secretKey) return "【加密消息：当前设备无密钥】";
  try {
    const payload = JSON.parse(input.content.slice(PREFIX.length)) as EncryptedPayload;
    const target = payload.boxes[String(input.currentUserId)];
    if (!target) return "【加密消息：当前用户无解密权限】";
    const plain = nacl.box.open(
      fromBase64(target.cipher),
      fromBase64(target.nonce),
      fromBase64(payload.senderPublicKey),
      fromBase64(input.secretKey)
    );
    if (!plain) return "【加密消息解密失败】";
    return new TextDecoder().decode(plain);
  } catch {
    return "【加密消息解析失败】";
  }
}
