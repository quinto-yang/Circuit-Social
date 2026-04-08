"use client";

import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Copy,
  ImagePlus,
  Lock,
  LogOut,
  MessageCircle,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  X
} from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { io, type Socket } from "socket.io-client";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReconnect,
  useSignMessage
} from "wagmi";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import { buildSiweMessage } from "@/lib/siwe";
import { webConfig } from "@/lib/config";
import { decryptContent, encryptForParticipants, ensureLocalKeyPair } from "@/lib/e2ee";
import type {
  ConversationSummary,
  FriendRequest,
  GroupMember,
  MessageView,
  MomentView,
  SessionUserPayload,
  TabKey,
  UploadAsset,
  WalletAccount
} from "@/lib/types";

type RequestsPayload = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};

type ModalState =
  | null
  | "contacts-menu"
  | "add-friend"
  | "create-group"
  | "join-group"
  | "requests"
  | "profile"
  | "feedback"
  | "contact"
  | "tenant-admin";

type TenantAppConfig = {
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

type MomentUploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  uploadId: number | null;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function buildAssetUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${webConfig.apiOrigin}${value}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function AppShell() {
  const [session, setSession] = useState<SessionUserPayload | null | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("chats");
  const [modal, setModal] = useState<ModalState>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [friends, setFriends] = useState<SessionUserPayload["user"][]>([]);
  const [requests, setRequests] = useState<RequestsPayload>({
    incoming: [],
    outgoing: []
  });
  const [moments, setMoments] = useState<MomentView[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupRole, setGroupRole] = useState<"owner" | "member">("member");
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<number[]>([]);
  const [groupManageOpen, setGroupManageOpen] = useState(false);
  const [momentDraft, setMomentDraft] = useState("");
  const [momentFiles, setMomentFiles] = useState<MomentUploadItem[]>([]);
  const [momentNotice, setMomentNotice] = useState("");
  const [friendTarget, setFriendTarget] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [contactsGroupExpanded, setContactsGroupExpanded] = useState(true);
  const [contactsFriendExpanded, setContactsFriendExpanded] = useState(true);
  const [discoverView, setDiscoverView] = useState<"menu" | "moments">("menu");
  const [status, setStatus] = useState<string>("");
  const [loginChainType, setLoginChainType] = useState<"evm" | "solana">("evm");
  const [bindChainType, setBindChainType] = useState<"evm" | "solana">("evm");
  const [feedbackDraft, setFeedbackDraft] = useState("");
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
  const [conversationEncryptionFallback, setConversationEncryptionFallback] = useState<
    Record<number, boolean>
  >({});
  const [conversationEncryptionEnabled, setConversationEncryptionEnabled] = useState<
    Record<number, boolean>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [preferredConnectorId, setPreferredConnectorId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    nickname: "",
    bio: "",
    avatarUrl: "",
    didUri: "",
    primaryWalletId: 0
  });
  const [didResolveStatus, setDidResolveStatus] = useState<{
    status: "unbound" | "resolvable" | "failed";
    detail: string;
  }>({
    status: "unbound",
    detail: "未绑定"
  });
  const [e2eeKeyPair, setE2eeKeyPair] = useState<{ publicKey: string; secretKey: string } | null>(
    null
  );

  const socketRef = useRef<Socket | null>(null);
  const messagesRef = useRef<MessageView[]>([]);
  const activeConversationRef = useRef<ConversationSummary | null>(null);

  const { reconnect } = useReconnect();
  const { connectors, connectAsync, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, chain, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const connectableConnectors = connectors.filter((connector) => connector.id !== "metaMaskSDK");
  const selectedConnector =
    connectableConnectors.find((connector) => connector.id === preferredConnectorId) ??
    connectableConnectors[0] ??
    null;

  const flashStatus = useCallback((message: string, durationMs = 1500) => {
    setStatus(message);
    window.setTimeout(() => {
      setStatus((previous) => (previous === message ? "" : previous));
    }, durationMs);
  }, []);

  useEffect(() => {
    if (loginChainType !== "solana") return;
    if (webConfig.enableSolanaLogin) return;
    setLoginChainType("evm");
  }, [loginChainType]);

  useEffect(() => {
    if (bindChainType !== "solana") return;
    if (webConfig.enableSolanaLogin) return;
    setBindChainType("evm");
  }, [bindChainType]);

  useEffect(() => {
    if (!connectableConnectors.length) {
      if (preferredConnectorId) {
        setPreferredConnectorId(null);
      }
      return;
    }
    if (
      !preferredConnectorId ||
      !connectableConnectors.some((connector) => connector.id === preferredConnectorId)
    ) {
      setPreferredConnectorId(connectableConnectors[0].id);
    }
  }, [connectableConnectors, preferredConnectorId]);

  useEffect(() => {
    reconnect();
  }, [reconnect]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (!session) return;
    setProfileForm({
      nickname: session.user.nickname,
      bio: session.user.bio,
      avatarUrl: session.user.avatarUrl ?? "",
      didUri: session.user.didUri ?? "",
      primaryWalletId:
        session.wallets.find((wallet) => wallet.isPrimary)?.id ?? session.wallets[0]?.id ?? 0
    });
  }, [session]);

  useEffect(() => {
    if (!session) {
      setDidResolveStatus({
        status: "unbound",
        detail: "未绑定"
      });
      return;
    }
    setDidResolveStatus(
      session.didStatus ?? {
        status: session.user.didUri ? "failed" : "unbound",
        detail: session.user.didUri ? "解析状态未知" : "未绑定"
      }
    );
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const keyPair = ensureLocalKeyPair();
    if (!keyPair) return;
    setE2eeKeyPair(keyPair);
    if (session.user.encryptionPublicKey === keyPair.publicKey) return;
    void api
      .post<{ user: SessionUserPayload["user"] & { wallets: WalletAccount[] } }>("/profile", {
        encryptionPublicKey: keyPair.publicKey
      })
      .then((result) => {
        setSession((previous) =>
          previous
            ? {
                user: {
                  ...previous.user,
                  encryptionPublicKey: result.user.encryptionPublicKey
                },
                wallets: previous.wallets,
                didStatus: previous.didStatus
              }
            : previous
        );
      })
      .catch(() => {
        setStatus("加密密钥初始化失败，消息将暂不可加密");
      });
  }, [session]);

  const currentUserId = session?.user.id ?? 0;

  const hydrateSession = useCallback(async () => {
    const result = await api.get<{
      ok: true;
      user: SessionUserPayload["user"] | null;
      wallets?: WalletAccount[];
      didStatus?: SessionUserPayload["didStatus"];
    }>("/me");
    if (!result.user) {
      setSession(null);
      return;
    }
    setSession({
      user: result.user,
      wallets: result.wallets ?? [],
      didStatus: result.didStatus
    });
  }, []);

  const loadContacts = useCallback(async () => {
    const [friendsResult, requestsResult] = await Promise.all([
      api.get<{ friends: SessionUserPayload["user"][] }>("/friends"),
      api.get<RequestsPayload>("/friend-requests")
    ]);
    setFriends(friendsResult.friends);
    setRequests(requestsResult);
  }, []);

  const loadMoments = useCallback(async () => {
    const result = await api.get<{ moments: MomentView[] }>("/moments");
    setMoments(result.moments);
  }, []);

  const boot = useCallback(async () => {
    try {
      setStatus("");
      await hydrateSession();
    } catch (error) {
      setStatus(mapApiError(error, "初始化失败"));
      setSession(null);
    }
  }, [hydrateSession]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const normalizeMessage = useCallback(
    (message: MessageView) => ({
      ...message,
      content: decryptContent({
        content: message.content,
        currentUserId,
        secretKey: e2eeKeyPair?.secretKey ?? null
      }),
      mine: message.sender.id === currentUserId
    }),
    [currentUserId, e2eeKeyPair]
  );

  const normalizeConversation = useCallback(
    (conversation: ConversationSummary) => ({
      ...conversation,
      lastMessage: conversation.lastMessage
        ? {
            ...conversation.lastMessage,
            content: decryptContent({
              content: conversation.lastMessage.content,
              currentUserId,
              secretKey: e2eeKeyPair?.secretKey ?? null
            })
          }
        : null
    }),
    [currentUserId, e2eeKeyPair]
  );

  const loadConversations = useCallback(async () => {
    const result = await api.get<{ conversations: ConversationSummary[] }>("/conversations");
    setConversations(result.conversations.map((conversation) => normalizeConversation(conversation)));
  }, [normalizeConversation]);

  useEffect(() => {
    if (!session) return;
    void Promise.all([loadConversations(), loadContacts(), loadMoments()]);
  }, [session, loadConversations, loadContacts, loadMoments]);

  const mergeMessage = useCallback(
    (message: MessageView) => {
      const next = normalizeMessage(message);
      setMessages((previous) => {
        if (previous.some((item) => item.id === next.id)) return previous;
        return [...previous, next];
      });
    },
    [normalizeMessage]
  );

  const mergeMoment = useCallback((moment: MomentView) => {
    setMoments((previous) => {
      if (previous.some((item) => item.id === moment.id)) return previous;
      return [moment, ...previous];
    });
  }, []);

  useEffect(() => {
    if (!session) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
      return;
    }

    const socket = io(webConfig.apiOrigin, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("conversation:updated", (items: ConversationSummary[]) => {
      setConversations(items.map((item) => normalizeConversation(item)));
    });
    socket.on("message:new", (message: MessageView) => {
      if (activeConversationRef.current?.id !== message.conversationId) return;
      mergeMessage(message);
    });
    socket.on("friend-request:new", () => {
      void loadContacts();
    });
    socket.on("moment:new", (moment: MomentView) => {
      mergeMoment(moment);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [session, loadContacts, mergeMessage, mergeMoment, normalizeConversation]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversation) return;
    socket.emit("subscribe:conversation", {
      conversationId: activeConversation.id
    });
    return () => {
      socket.emit("unsubscribe:conversation", {
        conversationId: activeConversation.id
      });
    };
  }, [activeConversation]);

  useEffect(() => {
    if (!session || !activeConversation || socketConnected) return;
    const interval = window.setInterval(async () => {
      const lastId = messagesRef.current.at(-1)?.id;
      const result = await api.get<{ messages: MessageView[] }>(
        `/messages?conversation_id=${activeConversation.id}${lastId ? `&after_id=${lastId}` : ""}`
      );
      if (result.messages.length) {
        setMessages((previous) => {
          const seen = new Set(previous.map((item) => item.id));
          return [
            ...previous,
            ...result.messages
              .filter((item) => !seen.has(item.id))
              .map((item) => normalizeMessage(item))
          ];
        });
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activeConversation, normalizeMessage, session, socketConnected]);

  const openConversation = useCallback(
    async (conversation: ConversationSummary) => {
      setBusy("conversation");
      try {
        const [messageResult, participantsResult, groupResult] = await Promise.all([
          api.get<{ messages: MessageView[] }>(
            `/messages?conversation_id=${conversation.id}`
          ),
          api.get<{ participants: SessionUserPayload["user"][] }>(
            `/conversations/${conversation.id}/participants`
          ),
          conversation.kind === "group"
            ? api.get<{ members: GroupMember[]; myRole: "owner" | "member" }>(
                `/groups/${conversation.id}/members`
              )
            : Promise.resolve(null)
        ]);

        setActiveConversation(conversation);
        setMessages(messageResult.messages.map((message) => normalizeMessage(message)));
        setSelectedMentions([]);
        setGroupManageOpen(false);
        setMessageDraft("");
        setGroupMembers(groupResult?.members ?? []);
        setGroupRole(groupResult?.myRole ?? "member");
        setConversationEncryptionEnabled((previous) => ({
          ...previous,
          [conversation.id]: participantsResult.participants.every(
            (participant) => !!participant.encryptionPublicKey
          )
        }));
        const lastMessageId = messageResult.messages.at(-1)?.id ?? null;
        void api.post("/messages/read", {
          conversationId: conversation.id,
          messageId: lastMessageId
        });
      } catch (error) {
        setStatus(mapApiError(error, "无法打开会话"));
      } finally {
        setBusy(null);
      }
    },
    [normalizeMessage]
  );

  async function ensureConnector(connectorId: string) {
    const connector = connectors.find((item) => item.id === connectorId);
    if (!connector) return;
    await connectAsync({ connector });
  }

  async function handleLoginPrimaryAction() {
    if (loginChainType === "solana" && !webConfig.enableSolanaLogin) {
      setStatus("Solana 登录灰度未开启，请先使用 EVM 钱包");
      return;
    }
    if (!isConnected) {
      if (!selectedConnector) {
        setStatus("当前没有可用钱包");
        return;
      }
      setStatus("");
      try {
        await ensureConnector(selectedConnector.id);
      } catch (error) {
        setStatus(mapApiError(error, "钱包连接失败"));
      }
      return;
    }
    await handleSiweLogin("login");
  }

  async function handleSiweLogin(intent: "login" | "bind", options?: { chainType?: "evm" | "solana" }) {
    const effectiveChainType = options?.chainType ?? (intent === "bind" ? bindChainType : loginChainType);
    if (effectiveChainType === "solana" && !webConfig.enableSolanaLogin) {
      setStatus("Solana 登录灰度未开启，请先使用 EVM 钱包");
      return;
    }
    if (!address || !chain) {
      setStatus("请先连接钱包");
      return;
    }
    setBusy(intent);
    setStatus("");
    try {
      const nonceResult = await api.post<{
        nonce: string;
        issuedAt: string;
      }>("/auth/nonce", {
        address,
        chainId: chain.id,
        chainType: effectiveChainType,
        intent
      });
      const message = buildSiweMessage({
        address,
        chainId: chain.id,
        nonce: nonceResult.nonce,
        issuedAt: nonceResult.issuedAt,
        statement:
          intent === "login"
            ? "Sign in to Circuit Social. Use a test wallet if this is your first visit."
            : "Bind this wallet to your Circuit Social profile."
      });
      const signature = await signMessageAsync({
        message
      });
      if (intent === "login") {
        const result = await api.post<SessionUserPayload>("/auth/verify", {
          message,
          signature,
          chainType: effectiveChainType,
          domain: window.location.host
        });
        startTransition(() => {
          setSession(result);
          setTab("chats");
        });
      } else {
        const result = await api.post<{
          user: SessionUserPayload["user"];
          wallets: WalletAccount[];
          didStatus?: SessionUserPayload["didStatus"];
        }>(
          "/wallets/bind",
          {
            message,
            signature,
            chainType: effectiveChainType,
            domain: window.location.host
          }
        );
        setSession({
          user: result.user,
          wallets: result.wallets,
          didStatus: result.didStatus
        });
        setStatus("钱包绑定成功");
      }
    } catch (error) {
      setStatus(mapApiError(error, "签名失败"));
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
      disconnect();
      setSession(null);
      setActiveConversation(null);
      setMessages([]);
    } catch (error) {
      setStatus(mapApiError(error, "退出失败"));
    }
  }

  async function submitFriendRequest() {
    if (!friendTarget.trim()) return;
    setBusy("friend-request");
    try {
      await api.post("/friend-requests", {
        target: friendTarget.trim()
      });
      setFriendTarget("");
      setModal(null);
      await loadContacts();
      setStatus("好友申请已发送");
    } catch (error) {
      setStatus(mapApiError(error, "发送失败"));
    } finally {
      setBusy(null);
    }
  }

  async function answerRequest(requestId: number, action: "accept" | "decline") {
    setBusy(`request-${requestId}`);
    try {
      await api.post(`/friend-requests/${requestId}/respond`, {
        action
      });
      await Promise.all([loadContacts(), loadConversations()]);
    } catch (error) {
      setStatus(mapApiError(error, "处理失败"));
    } finally {
      setBusy(null);
    }
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    setBusy("create-group");
    try {
      const result = await api.post<{ conversation: ConversationSummary }>("/groups", {
        name: groupName.trim()
      });
      setGroupName("");
      setModal(null);
      await loadConversations();
      await openConversation(result.conversation);
    } catch (error) {
      setStatus(mapApiError(error, "创建失败"));
    } finally {
      setBusy(null);
    }
  }

  async function joinGroup() {
    if (!joinCode.trim()) return;
    setBusy("join-group");
    try {
      await api.post("/groups/join", {
        inviteCode: joinCode.trim().toUpperCase()
      });
      setJoinCode("");
      setModal(null);
      await loadConversations();
    } catch (error) {
      setStatus(mapApiError(error, "加入失败"));
    } finally {
      setBusy(null);
    }
  }

  async function startDm(peerId: number) {
    try {
      const result = await api.post<{ conversation: ConversationSummary }>("/conversations/dm", {
        peerId
      });
      await loadConversations();
      await openConversation(result.conversation);
    } catch (error) {
      setStatus(mapApiError(error, "无法创建私聊"));
    }
  }

  async function sendMessage() {
    if (!activeConversation || !messageDraft.trim()) return;
    setBusy("send-message");
    try {
      const content = messageDraft.trim();
      if (!e2eeKeyPair) {
        throw new Error("加密密钥未初始化，请稍后重试");
      }
      const participantsResult = await api.get<{ participants: SessionUserPayload["user"][] }>(
        `/conversations/${activeConversation.id}/participants`
      );
      let outboundContent = content;
      try {
        outboundContent = encryptForParticipants({
          plainText: content,
          senderPublicKey: e2eeKeyPair.publicKey,
          senderSecretKey: e2eeKeyPair.secretKey,
          recipients: participantsResult.participants.map((participant) => ({
            userId: participant.id,
            encryptionPublicKey: participant.encryptionPublicKey
          }))
        });
      } catch {
        // Fallback to plaintext so messaging is not blocked
        // when some conversation participants have not initialized keys yet.
        setConversationEncryptionFallback((previous) => ({
          ...previous,
          [activeConversation.id]: true
        }));
      }
      const result = await api.post<{ message: MessageView }>("/messages", {
        conversationId: activeConversation.id,
        content: outboundContent,
        mentionUserIds: selectedMentions
      });
      mergeMessage(result.message);
      setMessageDraft("");
      setSelectedMentions([]);
      await loadConversations();
    } catch (error) {
      setStatus(mapApiError(error, "消息发送失败"));
    } finally {
      setBusy(null);
    }
  }

  function enqueueMomentUploads(files: File[]) {
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
            previous.map((item) =>
              item.id === localId ? { ...item, status: "error" } : item
            )
          );
        });
    });
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await api.post<{ upload: UploadAsset }>("/uploads/image", formData);
    return result.upload.url;
  }

  async function publishMoment() {
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
  }

  async function saveProfile() {
    if (!profileForm.nickname.trim()) return;
    setBusy("profile");
    try {
      const result = await api.post<{
        user: SessionUserPayload["user"] & { wallets: WalletAccount[] };
        didStatus?: SessionUserPayload["didStatus"];
      }>(
        "/profile",
        {
          nickname: profileForm.nickname.trim(),
          bio: profileForm.bio.trim(),
          avatarUrl: profileForm.avatarUrl.trim() || null,
          didUri: profileForm.didUri.trim() || null,
          primaryWalletId: profileForm.primaryWalletId
        }
      );
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
    } catch (error) {
      setStatus(mapApiError(error, "保存失败"));
    } finally {
      setBusy(null);
    }
  }

  async function kickMember(memberId: number) {
    if (!activeConversation) return;
    if (!window.confirm("确定移出该成员？")) return;
    try {
      const result = await api.post<{ members: GroupMember[]; myRole: "owner" | "member" }>(
        `/groups/${activeConversation.id}/kick`,
        {
          userId: memberId
        }
      );
      setGroupMembers(result.members);
      setGroupRole(result.myRole);
    } catch (error) {
      setStatus(mapApiError(error, "操作失败"));
    }
  }

  async function toggleMute(member: GroupMember) {
    if (!activeConversation) return;
    const muted = member.mutedUntil && new Date(member.mutedUntil).getTime() > Date.now();
    const minutes = muted ? 0 : Number(window.prompt("禁言分钟数", "60") ?? "0");
    if (!muted && !minutes) return;
    try {
      const result = await api.post<{ members: GroupMember[]; myRole: "owner" | "member" }>(
        `/groups/${activeConversation.id}/mute`,
        {
          userId: member.id,
          minutes
        }
      );
      setGroupMembers(result.members);
      setGroupRole(result.myRole);
    } catch (error) {
      setStatus(mapApiError(error, "操作失败"));
    }
  }

  async function leaveGroup() {
    if (!activeConversation) return;
    if (!window.confirm("确定退出当前群聊？")) return;
    try {
      await api.post(`/groups/${activeConversation.id}/leave`);
      setActiveConversation(null);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      setStatus(mapApiError(error, "退群失败"));
    }
  }

  async function reportMoment(momentId: number) {
    const reason = window.prompt("举报原因", "垃圾信息");
    if (!reason) return;
    try {
      await api.post("/reports", {
        kind: "moment",
        targetId: momentId,
        reason
      });
      setStatus("举报已提交");
    } catch (error) {
      setStatus(mapApiError(error, "举报失败"));
    }
  }

  async function submitFeedback() {
    if (!feedbackDraft.trim()) return;
    setBusy("feedback");
    try {
      setFeedbackDraft("");
      setStatus("反馈已收到，感谢你的建议");
    } catch (error) {
      setStatus(mapApiError(error, "反馈提交失败"));
    } finally {
      setBusy(null);
    }
  }

  async function loadTenantApps() {
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
  }

  async function createTenantApp() {
    if (!tenantAppName.trim()) return;
    setBusy("tenant-create");
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
      flashStatus("应用创建成功");
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
    try {
      await api.post(`/tenant/apps/${appId}/domains`, { domain });
      setTenantDomainDraft((previous) => ({ ...previous, [appId]: "" }));
      await loadTenantApps();
      flashStatus("域名已添加");
    } catch (error) {
      setStatus(mapApiError(error, "添加域名失败"));
    } finally {
      setBusy(null);
    }
  }

  async function updateTenantApp(appId: number) {
    setBusy(`tenant-update-${appId}`);
    try {
      await api.post(`/tenant/apps/${appId}`, {
        name: tenantEditName[appId]?.trim(),
        chainPolicy: tenantEditChainPolicy[appId],
        callbackUrl: tenantEditCallback[appId]?.trim() || null
      });
      await loadTenantApps();
      flashStatus("应用配置已更新");
    } catch (error) {
      setStatus(mapApiError(error, "更新应用失败"));
    } finally {
      setBusy(null);
    }
  }

  async function updateTenantBranding(appId: number) {
    setBusy(`tenant-branding-${appId}`);
    try {
      await api.post(`/tenant/apps/${appId}/branding`, {
        displayName: tenantEditBrandName[appId]?.trim() || null,
        themeColor: tenantEditBrandTheme[appId]?.trim() || null,
        logoUrl: tenantEditBrandLogo[appId]?.trim() || null
      });
      await loadTenantApps();
      flashStatus("品牌配置已更新");
    } catch (error) {
      setStatus(mapApiError(error, "更新品牌配置失败"));
    } finally {
      setBusy(null);
    }
  }

  async function rotateTenantKey(appId: number) {
    setBusy(`tenant-rotate-key-${appId}`);
    try {
      await api.post(`/tenant/apps/${appId}/keys/rotate`);
      await loadTenantApps();
      flashStatus("已轮换应用密钥");
    } catch (error) {
      setStatus(mapApiError(error, "轮换密钥失败"));
    } finally {
      setBusy(null);
    }
  }

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <main className="relative h-[100dvh] overflow-hidden bg-[#081118] px-3 py-3 text-white sm:px-5 sm:py-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(32,201,151,0.18),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(102,183,255,0.14),transparent_18%),linear-gradient(180deg,#102127_0%,#091117_45%,#05090d_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-[520px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(39,230,149,0.12)_0%,transparent_62%)] blur-3xl"
        />

        <section className="relative mx-auto flex h-full w-full max-w-[398px] flex-col justify-start gap-2 pt-1 sm:max-w-[406px] sm:justify-center sm:gap-3 sm:pt-0">
          <div
            data-testid="login-brand-block"
            className="rounded-[24px] border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:rounded-[28px] sm:px-4 sm:py-3.5 sm:shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-[20px] border border-white/15 bg-white/10 p-1.5 shadow-[0_16px_28px_rgba(0,0,0,0.18)] sm:rounded-[24px] sm:p-2 sm:shadow-[0_20px_40px_rgba(0,0,0,0.22)]">
                <div className="rounded-[16px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(214,223,228,0.92)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:rounded-[20px] sm:p-2.5">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#3a454d_0%,#20272d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.22)] sm:h-[62px] sm:w-[62px] sm:rounded-[18px] sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_30px_rgba(0,0,0,0.25)]">
                    <div className="relative flex h-[35px] w-[42px] items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#ffffff_0%,#eef2f6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-[42px] sm:w-[50px] sm:rounded-[14px]">
                      <div className="absolute -bottom-[3px] left-[8px] h-2.5 w-2.5 rotate-45 rounded-[4px] bg-[#2a93ff] sm:left-[10px] sm:h-3 sm:w-3" />
                      <div className="absolute inset-x-[4px] top-[7px] h-[20px] rounded-full bg-[linear-gradient(135deg,#55c2ff_0%,#2c8bff_45%,#4e67ff_78%,#19d088_100%)] shadow-[0_5px_12px_rgba(46,139,255,0.28)] sm:inset-x-[5px] sm:top-[8px] sm:h-[25px]" />
                      <span className="relative text-[18px] font-black tracking-[-0.08em] text-white sm:text-[22px]">
                        CX
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="mb-1 hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/52 sm:inline-flex">
                  Secure Entry
                </div>
                <h1 className="text-[25px] font-black leading-none tracking-[-0.06em] text-white sm:text-[32px]">
                  Circuit Social
                </h1>
                <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-white/55 sm:mt-1.5 sm:text-[11px] sm:tracking-[0.22em]">
                  链上身份 · 安全会话
                </p>
              </div>
            </div>
          </div>

          <div className="w-full rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(241,244,246,0.95)_100%)] p-3.5 text-slate-900 shadow-[0_26px_60px_rgba(0,0,0,0.22)] sm:rounded-[30px] sm:p-5 sm:shadow-[0_34px_80px_rgba(0,0,0,0.26)]">
            <div className="space-y-3">
              <div className="rounded-[20px] bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.05)_100%)] px-3.5 py-3 sm:rounded-[22px] sm:px-4 sm:py-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-[11px] sm:tracking-[0.24em]">
                  Wallet Sign-In
                </div>
                <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-700 sm:mt-2 sm:text-[14px] sm:leading-6">
                  使用钱包一键连接，签名即可完成注册与登录，无需额外密码。
                </p>
              </div>

              <div className="grid gap-2 rounded-[22px] bg-slate-100/90 px-3.5 py-3 text-[12px] leading-4.5 text-slate-600 sm:rounded-[24px] sm:gap-2.5 sm:px-4 sm:py-3.5 sm:text-[13px] sm:leading-5">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-jade/12 text-jade sm:h-5 sm:w-5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>去中心化身份，数据自持</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-jade/12 text-jade sm:h-5 sm:w-5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>确认一次签名，即可建立会话</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-jade/12 text-jade sm:h-5 sm:w-5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>支持 Base / ETH / ARB / BNB</span>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-3 sm:px-4 sm:py-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Chain Type
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginChainType("evm")}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      loginChainType === "evm"
                        ? "border-slate-900/10 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    EVM
                  </button>
                  <button
                    type="button"
                    disabled={!webConfig.enableSolanaLogin}
                    onClick={() => {
                      if (!webConfig.enableSolanaLogin) return;
                      setLoginChainType("solana");
                    }}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      !webConfig.enableSolanaLogin && "cursor-not-allowed opacity-55",
                      loginChainType === "solana"
                        ? "border-slate-900/10 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    {!webConfig.enableSolanaLogin ? <Lock className="h-3.5 w-3.5" /> : null}
                    {webConfig.enableSolanaLogin ? "Solana" : "Solana (按开关启用)"}
                  </button>
                </div>
                {!webConfig.enableSolanaLogin ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] leading-4 text-slate-500">
                      Solana 登录当前处于灰度阶段，可通过设置环境变量并重启 Web 开启。
                    </p>
                    <DataRow
                      label="一键复制"
                      value="NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true"
                      copyable
                      onCopied={() => flashStatus("已复制：NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-[18px] border border-amber-200/80 bg-[linear-gradient(180deg,#fff7e8_0%,#fff1d2_100%)] px-3.5 py-3 text-[12px] text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:rounded-[20px] sm:px-4 sm:py-3.5 sm:text-[13px]">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-8 sm:w-8">
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="font-semibold text-amber-800">安全提示</div>
                    <p className="mt-1 leading-4.5 text-amber-900/80 sm:leading-5">
                      建议优先使用测试钱包或小额地址，签名前确认域名、链 ID 与用途说明。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {connectableConnectors.map((connector) => (
                  <button
                    key={connector.id}
                    type="button"
                    data-testid={`wallet-option-${connector.id}`}
                    onClick={() => setPreferredConnectorId(connector.id)}
                    className={cn(
                      "min-w-0 rounded-[16px] border px-3 py-2 text-center text-[12px] font-semibold transition sm:rounded-[18px] sm:py-2.5 sm:text-[13px]",
                      selectedConnector?.id === connector.id
                        ? "border-slate-900/10 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    <span className="block truncate">{connector.name}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-[20px] bg-[linear-gradient(180deg,#0f1720_0%,#08131b_100%)] px-3.5 py-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[22px] sm:px-4 sm:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-black tracking-[-0.04em] sm:text-base">
                      {isConnected && address
                        ? shortAddress(address)
                        : selectedConnector?.name ?? "选择钱包"}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/46 sm:text-[11px] sm:tracking-[0.22em]">
                      {isConnected ? chain?.name ?? "已连接" : "等待钱包授权"}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
                    {isConnected ? "Ready" : "Wallet"}
                  </div>
                </div>
                <p className="mt-2.5 text-[11px] leading-4.5 text-white/62 sm:mt-3 sm:text-xs sm:leading-5">
                  签名只用于创建会话，不会转账，也不会索取私钥。
                </p>
                <button
                  type="button"
                  data-testid="login-primary-button"
                  disabled={
                    (loginChainType === "solana" && !webConfig.enableSolanaLogin) ||
                    ((!isConnected && !selectedConnector) || connectPending || busy === "login")
                  }
                  onClick={() => void handleLoginPrimaryAction()}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#33ea98_0%,#1dcc7b_56%,#14b66b_100%)] px-4 py-3 text-[15px] font-black text-[#08341f] shadow-[0_16px_30px_rgba(18,199,118,0.24),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 sm:mt-4 sm:rounded-[18px] sm:py-3.5 sm:text-base sm:shadow-[0_18px_34px_rgba(18,199,118,0.28),inset_0_1px_0_rgba(255,255,255,0.55)]"
                >
                  {connectPending
                    ? "钱包连接中..."
                    : busy === "login"
                      ? "签名中..."
                        : loginChainType === "solana" && !webConfig.enableSolanaLogin
                          ? "Solana 入口未启用"
                      : isConnected
                        ? "确认签名登录"
                        : `使用 ${selectedConnector?.name ?? "钱包"} 连接`}
                </button>
              </div>
            </div>
          </div>

          <div className="px-2 pt-0.5 text-center text-[11px] text-white/55 sm:min-h-6 sm:pt-0 sm:text-xs">
            {status || "请使用新钱包或测试钱包体验。"}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] px-3 py-4">
      <section className="relative flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.78)] shadow-panel backdrop-blur">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-4 h-24 rounded-full bg-jade/10 blur-3xl"
        />
        {activeConversation ? (
          <ChatRoom
            conversation={activeConversation}
            messages={messages}
            onBack={() => {
              setActiveConversation(null);
              setGroupManageOpen(false);
              setSelectedMentions([]);
            }}
            onSend={() => void sendMessage()}
            draft={messageDraft}
            setDraft={setMessageDraft}
            members={groupMembers}
            role={groupRole}
            mentions={selectedMentions}
            setMentions={setSelectedMentions}
            groupManageOpen={groupManageOpen}
            setGroupManageOpen={setGroupManageOpen}
            onKick={kickMember}
            onMute={toggleMute}
            onLeaveGroup={() => void leaveGroup()}
            onCopyInviteCode={() => {
              const inviteCode = activeConversation.inviteCode;
              if (!inviteCode) return;
              void navigator.clipboard
                .writeText(inviteCode)
                .then(() => flashStatus(`已复制群号：${inviteCode}`))
                .catch(() => setStatus("复制群号失败，请手动复制"));
            }}
            encryptionEnabled={Boolean(conversationEncryptionEnabled[activeConversation.id])}
            encryptionFallback={Boolean(conversationEncryptionFallback[activeConversation.id])}
            busy={busy === "send-message"}
          />
        ) : (
          <>
            <TopBar
              tab={tab}
              requestCount={requests.incoming.length}
              onOpenMenu={() => setModal("contacts-menu")}
            />

            <div className="relative flex-1 overflow-y-auto px-4 pb-28">
              {status && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-soft">
                  {status}
                </div>
              )}

              {tab === "chats" && (
                <div className="space-y-4 pb-8 pt-4">
                  <HeroCard
                    title="Secure social, signed in public"
                    description="钱包登录只负责证明身份，真正留住用户的是会话、关系和社区归属。"
                  />
                  {webConfig.adsEnabled && (
                    <AdBanner
                      slot="chats-top"
                      title="Circuit Social：链上身份驱动的社交协作"
                      description="用钱包完成身份登录，在同一入口管理私聊、群聊与社区协作。"
                      compact
                    />
                  )}
                  <Card>
                    <SectionTitle title="会话" hint={`${conversations.length} 个会话`} />
                    <div className="space-y-2">
                      {conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => void openConversation(conversation)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-slate-50 px-3 py-2.5 text-left transition hover:border-jade/20 hover:bg-white"
                        >
                          <Avatar
                            label={conversation.title}
                            image={null}
                            tone={conversation.kind === "group" ? "emerald" : "sky"}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate font-semibold text-slate-900">
                                {conversation.title}
                              </div>
                              <div className="flex items-center gap-2">
                                {conversation.kind === "group" && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    群
                                  </span>
                                )}
                                {conversation.unreadCount > 0 && (
                                  <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-white">
                                    {conversation.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {conversation.lastMessage
                                ? `${conversation.lastMessage.senderNickname}: ${conversation.lastMessage.content}`
                                : conversation.kind === "group"
                                  ? `群号 ${conversation.inviteCode ?? "-"}`
                                  : "点击开始聊天"}
                            </div>
                            {conversation.unreadCount > 0 && (
                              <div className="mt-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                                未读消息 {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {tab === "contacts" && (
                <div className="space-y-4 pb-8 pt-4">
                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle
                        title="我的群聊"
                        hint={`${conversations.filter((item) => item.kind === "group").length} 个`}
                      />
                      <button
                        type="button"
                        onClick={() => setContactsGroupExpanded((previous) => !previous)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {contactsGroupExpanded ? "收起" : "展开"}
                      </button>
                    </div>
                    {contactsGroupExpanded && (
                      <div className="mt-2 space-y-2">
                        {conversations
                          .filter((conversation) => conversation.kind === "group")
                          .map((conversation) => (
                            <button
                              key={conversation.id}
                              type="button"
                              onClick={() => void openConversation(conversation)}
                              className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-white"
                            >
                              <Avatar label={conversation.title} image={null} tone="emerald" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold text-slate-900">
                                  {conversation.title}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  群号 {conversation.inviteCode ?? "-"}
                                </div>
                              </div>
                              {conversation.unreadCount > 0 && (
                                <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-white">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </button>
                          ))}
                        {conversations.filter((item) => item.kind === "group").length === 0 && (
                          <EmptyState
                            icon={<Users className="h-5 w-5" />}
                            title="暂无群聊"
                            description="可通过创建群聊或输入群邀请码加入。"
                          />
                        )}
                      </div>
                    )}
                  </Card>

                  {webConfig.adsEnabled && (
                    <AdBanner
                      slot="contacts-middle"
                      title="一键连接关系与群组网络"
                      description="支持加好友、建群、入群与群管理，快速搭建稳定的协作圈层。"
                    />
                  )}

                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle title="好友" hint={`${friends.length} 位`} />
                      <button
                        type="button"
                        onClick={() => setContactsFriendExpanded((previous) => !previous)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {contactsFriendExpanded ? "收起" : "展开"}
                      </button>
                    </div>
                    {contactsFriendExpanded && (
                      <div className="space-y-2">
                        {friends.map((friend) => (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => void startDm(friend.id)}
                            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-white"
                          >
                            <Avatar label={friend.nickname} image={friend.avatarUrl} tone="emerald" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-slate-900">
                                {friend.nickname}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {shortAddress(friend.primaryWalletAddress)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {tab === "discover" && (
                <div className="space-y-4 pb-8 pt-4">
                  {discoverView === "menu" ? (
                    <>
                      {webConfig.adsEnabled && (
                        <AdBanner
                          slot="discover-menu-top"
                          title="发现页：内容分发与社区增长入口"
                          description="朋友圈支持图文发布、互动扩散与关系沉淀，帮助内容触达更多人。"
                        />
                      )}
                      <Card>
                        <SectionTitle title="发现" hint="更多模块持续接入" />
                        <div className="mt-2 space-y-2">
                          <button
                            type="button"
                            onClick={() => setDiscoverView("moments")}
                          className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-white"
                          >
                            <div>
                              <div className="font-semibold text-slate-900">朋友圈</div>
                              <div className="text-xs text-slate-500">查看与发布图文动态</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      </Card>
                    </>
                  ) : (
                    <>
                      <Card>
                        <div className="flex items-center justify-between gap-3">
                          <SectionTitle title="朋友圈" hint="图文动态仅对站内用户展示" />
                          <button
                            type="button"
                            onClick={() => setDiscoverView("menu")}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            返回列表
                          </button>
                        </div>
                        <textarea
                          value={momentDraft}
                          onChange={(event) => {
                            setMomentDraft(event.target.value);
                            if (momentNotice) {
                              setMomentNotice("");
                            }
                          }}
                          placeholder="分享新鲜事、群组动态或产品进展..."
                          className="mt-2 h-28 w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-jade/40 focus:bg-white"
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                            <ImagePlus className="h-4 w-4" />
                            配图
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                const next = Array.from(event.target.files ?? []);
                                enqueueMomentUploads(next);
                                if (momentNotice) {
                                  setMomentNotice("");
                                }
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <span className="text-xs text-slate-500">{momentFiles.length}/9 张</span>
                        </div>
                        {momentFiles.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {momentFiles.map((item, index) => (
                              <div
                                key={`${item.id}-${index}`}
                                className="relative overflow-hidden rounded-2xl bg-slate-100"
                              >
                                <img
                                  src={URL.createObjectURL(item.file)}
                                  alt=""
                                  className="h-24 w-full object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-slate-950/55 px-2 py-1 text-[10px] text-white">
                                  {item.status === "uploading" && `上传中 ${item.progress}%`}
                                  {item.status === "done" && "上传完成"}
                                  {item.status === "error" && "上传失败"}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMomentFiles((previous) =>
                                      previous.filter((_, current) => current !== index)
                                    )
                                  }
                                  className="absolute right-2 top-2 rounded-full bg-slate-950/60 p-1 text-white"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => void publishMoment()}
                          disabled={
                            busy === "publish-moment" ||
                            (!momentDraft.trim() && momentFiles.length === 0)
                          }
                          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-jade px-4 py-3 font-semibold text-ink transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          {busy === "publish-moment" ? "发布中..." : "发布动态"}
                        </button>
                        {momentNotice && (
                          <p className="mt-2 text-sm text-slate-500">{momentNotice}</p>
                        )}
                      </Card>

                      {webConfig.adsEnabled && (
                        <AdBanner
                          slot="moments-feed-top"
                          title="朋友圈：轻内容表达 + 社交关系沉淀"
                          description="选图即上传、实时展示进度，发布后即时触达好友与社群。"
                        />
                      )}

                      <div className="space-y-3">
                        {moments.map((moment) => (
                          <Card key={moment.id}>
                            <div className="flex items-start gap-3">
                              <Avatar
                                label={moment.author.nickname}
                                image={moment.author.avatarUrl}
                                tone="emerald"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {moment.author.nickname}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {formatTime(moment.createdAt)}
                                    </div>
                                  </div>
                                  {!moment.mine && (
                                    <button
                                      type="button"
                                      onClick={() => void reportMoment(moment.id)}
                                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                                    >
                                      举报
                                    </button>
                                  )}
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {moment.content}
                                </p>
                                {moment.images.length > 0 && (
                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    {moment.images.map((image) => (
                                      <img
                                        key={image.id}
                                        src={buildAssetUrl(image.url) ?? image.url}
                                        alt=""
                                        className="h-24 w-full rounded-2xl object-cover"
                                      />
                                    ))}
                                  </div>
                                )}
                                {!moment.mine && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTab("contacts");
                                      setModal("add-friend");
                                      setFriendTarget(String(moment.author.id));
                                    }}
                                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-jade/10 px-3 py-2 text-xs font-medium text-jade-deep"
                                  >
                                    <CirclePlus className="h-3.5 w-3.5" />
                                    添加作者为好友
                                  </button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "me" && (
                <div className="space-y-4 pb-8 pt-4">
                  <HeroCard
                    title={session.user.nickname}
                    description={session.user.bio || "用钱包证明身份，用会话建立关系。"}
                    tone="dark"
                  />
                  <Card>
                    <div className="flex items-start gap-4">
                      <Avatar
                        label={session.user.nickname}
                        image={session.user.avatarUrl}
                        tone="emerald"
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-[var(--font-display)] text-2xl font-bold tracking-[-0.05em] text-slate-950">
                          {session.user.nickname}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                          User ID {session.user.id}
                        </div>
                        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                          {shortAddress(session.user.primaryWalletAddress)} ·{" "}
                          {session.user.primaryChainLabel}
                        </div>
                        <button
                          type="button"
                          onClick={() => setModal("profile")}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-jade px-4 py-2 text-sm font-semibold text-ink"
                        >
                          编辑资料
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle title="会话状态" hint={socketConnected ? "实时连接已建立" : "已回退轮询"} />
                    <div className="space-y-3 text-sm text-slate-600">
                      <DataRow
                        label="我的 ID"
                        value={String(session.user.id)}
                        copyable
                        onCopied={() => flashStatus(`已复制：${session.user.id}`)}
                      />
                      <DataRow
                        label="主钱包"
                        value={session.user.primaryWalletAddress}
                        copyable
                        onCopied={() => flashStatus("已复制：主钱包地址")}
                      />
                      <DataRow label="链" value={`${session.user.primaryChainLabel} (${session.user.primaryChainId})`} />
                      <DataRow
                        label="DID URI"
                        value={session.user.didUri ?? "未绑定"}
                        copyable={Boolean(session.user.didUri)}
                        onCopied={() => flashStatus("已复制：DID URI")}
                      />
                      <DataRow label="DID 状态" value={didResolveStatus.detail} />
                      <DataRow label="已绑定钱包" value={`${session.wallets.length} 个`} />
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle title="帮助与反馈" hint="问题建议随时提交" />
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => setModal("feedback")}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-white"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">意见反馈</div>
                          <div className="text-xs text-slate-500">进入二级页面填写反馈内容</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal("contact")}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-white"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">联系我们</div>
                          <div className="text-xs text-slate-500">查看商务合作与技术支持渠道</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModal("tenant-admin");
                          void loadTenantApps();
                        }}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-white"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">应用配置</div>
                          <div className="text-xs text-slate-500">多租户应用与域名白名单</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </Card>

                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 font-semibold text-coral"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>

            <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/90 px-3 pb-5 pt-3 backdrop-blur">
              <div className="grid grid-cols-4 gap-2">
                <TabButton
                  active={tab === "chats"}
                  label="聊天"
                  dot={conversations.some((conversation) => conversation.unreadCount > 0)}
                  icon={<MessageCircle className="h-5 w-5" />}
                  onClick={() => setTab("chats")}
                />
                <TabButton
                  active={tab === "contacts"}
                  label="通讯录"
                  badge={requests.incoming.length || undefined}
                  icon={<Users className="h-5 w-5" />}
                  onClick={() => setTab("contacts")}
                />
                <TabButton
                  active={tab === "discover"}
                  label="发现"
                  icon={<Search className="h-5 w-5" />}
                  onClick={() => {
                    setTab("discover");
                    setDiscoverView("menu");
                  }}
                />
                <TabButton
                  active={tab === "me"}
                  label="我的"
                  icon={<UserRound className="h-5 w-5" />}
                  onClick={() => setTab("me")}
                />
              </div>
            </nav>
          </>
        )}

        <Overlay open={modal !== null} onClose={() => setModal(null)}>
          {modal === "contacts-menu" && (
            <MenuSheet
              title="通讯录动作"
              actions={[
                {
                  label: "添加好友",
                  description: "通过用户 ID 或钱包地址建立关系",
                  onClick: () => setModal("add-friend")
                },
                {
                  label: "创建群聊",
                  description: "创建项目群、任务群或测试群",
                  onClick: () => setModal("create-group")
                },
                {
                  label: "加入群聊",
                  description: "输入 8 位群邀请码",
                  onClick: () => setModal("join-group")
                },
                {
                  label: "新的朋友",
                  description: "处理待接受的好友申请",
                  badge: requests.incoming.length,
                  onClick: () => setModal("requests")
                }
              ]}
            />
          )}

          {modal === "add-friend" && (
            <ModalCard
              title="添加好友"
              subtitle="输入目标用户 ID 或完整钱包地址"
              actions={
                <button
                  type="button"
                  onClick={() => void submitFriendRequest()}
                  className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
                >
                  {busy === "friend-request" ? "发送中..." : "发送好友申请"}
                </button>
              }
            >
              <Input
                value={friendTarget}
                onChange={setFriendTarget}
                placeholder="例如 3 或 0xabc..."
              />
            </ModalCard>
          )}

          {modal === "create-group" && (
            <ModalCard
              title="创建群聊"
              subtitle="群创建后会自动生成 8 位邀请码"
              actions={
                <button
                  type="button"
                  onClick={() => void createGroup()}
                  className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
                >
                  {busy === "create-group" ? "创建中..." : "创建群聊"}
                </button>
              }
            >
              <Input
                value={groupName}
                onChange={setGroupName}
                placeholder="输入群名称"
              />
            </ModalCard>
          )}

          {modal === "join-group" && (
            <ModalCard
              title="加入群聊"
              subtitle="请输入群主分享的 8 位邀请码"
              actions={
                <button
                  type="button"
                  onClick={() => void joinGroup()}
                  className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
                >
                  {busy === "join-group" ? "加入中..." : "加入群聊"}
                </button>
              }
            >
              <Input
                value={joinCode}
                onChange={(value) => setJoinCode(value.toUpperCase())}
                placeholder="例如 C8X6J2QH"
              />
            </ModalCard>
          )}

          {modal === "requests" && (
            <ModalCard title="新的朋友" subtitle="处理收到的好友申请">
                <div className="space-y-2.5">
                {requests.incoming.map((request) => (
                  <div
                    key={request.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        label={request.from.nickname}
                        image={request.from.avatarUrl}
                        tone="emerald"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">{request.from.nickname}</div>
                        <div className="truncate text-xs text-slate-500">
                          {shortAddress(request.from.primaryWalletAddress)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void answerRequest(request.id, "decline")}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        拒绝
                      </button>
                      <button
                        type="button"
                        onClick={() => void answerRequest(request.id, "accept")}
                        className="rounded-2xl bg-jade px-3 py-2 text-sm font-semibold text-ink"
                      >
                        {busy === `request-${request.id}` ? "处理中..." : "接受"}
                      </button>
                    </div>
                  </div>
                ))}
                {requests.incoming.length === 0 && (
                  <EmptyState
                    icon={<Bell className="h-5 w-5" />}
                    title="暂无待处理申请"
                    description="来自好友推荐、群扩散或朋友圈互动的申请会出现在这里。"
                  />
                )}
              </div>
            </ModalCard>
          )}

          {modal === "profile" && (
            <ModalCard
              title="编辑资料"
              subtitle="统一链上身份入口与站内资料展示"
              actions={
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void saveProfile()}
                    className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
                  >
                    {busy === "profile" ? "保存中..." : "保存资料"}
                  </button>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Bind Chain Type
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBindChainType("evm")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                          bindChainType === "evm"
                            ? "border-slate-900/10 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                        )}
                      >
                        EVM
                      </button>
                      <button
                        type="button"
                        disabled={!webConfig.enableSolanaLogin}
                        onClick={() => {
                          if (!webConfig.enableSolanaLogin) return;
                          setBindChainType("solana");
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                          !webConfig.enableSolanaLogin && "cursor-not-allowed opacity-55",
                          bindChainType === "solana"
                            ? "border-slate-900/10 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                        )}
                      >
                        {webConfig.enableSolanaLogin ? "Solana" : "Solana (按开关启用)"}
                      </button>
                    </div>
                    {!webConfig.enableSolanaLogin ? (
                      <p className="mt-2 text-[11px] leading-4 text-slate-500">
                        Solana 绑定当前处于灰度阶段，可通过设置{" "}
                        <span className="font-semibold text-slate-700">
                          NEXT_PUBLIC_ENABLE_SOLANA_LOGIN=true
                        </span>{" "}
                        并重启 Web 开启。
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSiweLogin("bind", { chainType: bindChainType })}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    <Wallet className="h-4 w-4" />
                    绑定当前已连接钱包
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                <LabeledField label="昵称">
                  <Input
                    value={profileForm.nickname}
                    onChange={(value) =>
                      setProfileForm((previous) => ({ ...previous, nickname: value }))
                    }
                    placeholder="输入显示昵称"
                  />
                </LabeledField>
                <LabeledField label="简介">
                  <textarea
                    value={profileForm.bio}
                    onChange={(event) =>
                      setProfileForm((previous) => ({ ...previous, bio: event.target.value }))
                    }
                    className="h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-jade/40 focus:bg-white"
                    placeholder="补充你在社区的角色和关注方向"
                  />
                </LabeledField>
                <LabeledField label="头像上传">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                      <ImagePlus className="h-4 w-4" />
                      {busy === "avatar-upload" ? "上传中..." : "上传头像"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          if (!file) return;
                          setBusy("avatar-upload");
                          void uploadAvatar(file)
                            .then((avatarUrl) => {
                              setProfileForm((previous) => ({ ...previous, avatarUrl }));
                              setStatus("头像上传成功");
                            })
                            .catch((error) =>
                              setStatus(mapApiError(error, "头像上传失败"))
                            )
                            .finally(() => setBusy(null));
                        }}
                      />
                    </label>
                    {profileForm.avatarUrl ? (
                      <img
                        src={buildAssetUrl(profileForm.avatarUrl) ?? profileForm.avatarUrl}
                        alt="avatar preview"
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                    ) : null}
                  </div>
                </LabeledField>
                <LabeledField label="头像 URL">
                  <Input
                    value={profileForm.avatarUrl}
                    onChange={(value) =>
                      setProfileForm((previous) => ({ ...previous, avatarUrl: value }))
                    }
                    placeholder="https://..."
                  />
                </LabeledField>
                <LabeledField label="DID URI">
                  <Input
                    value={profileForm.didUri}
                    onChange={(value) =>
                      setProfileForm((previous) => ({ ...previous, didUri: value }))
                    }
                    placeholder="did:ethr:sepolia:0x..."
                  />
                </LabeledField>
                <LabeledField label="主钱包">
                  <select
                    value={profileForm.primaryWalletId}
                    onChange={(event) =>
                      setProfileForm((previous) => ({
                        ...previous,
                        primaryWalletId: Number(event.target.value)
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    {session.wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.chainLabel} · {shortAddress(wallet.address)}
                      </option>
                    ))}
                  </select>
                </LabeledField>
              </div>
            </ModalCard>
          )}

          {modal === "feedback" && (
            <ModalCard
              title="意见反馈"
              subtitle="你的每条建议都会帮助我们迭代产品"
              actions={
                <button
                  type="button"
                  onClick={() => void submitFeedback()}
                  disabled={busy === "feedback" || !feedbackDraft.trim()}
                  className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {busy === "feedback" ? "提交中..." : "提交反馈"}
                </button>
              }
            >
              <textarea
                value={feedbackDraft}
                onChange={(event) => setFeedbackDraft(event.target.value)}
                placeholder="例如：希望优化哪些交互、功能或视觉细节..."
                className="h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-jade/40 focus:bg-white"
              />
            </ModalCard>
          )}

          {modal === "contact" && (
            <ModalCard title="联系我们" subtitle="欢迎交流产品建议、合作与技术问题">
              <div className="space-y-3 text-sm text-slate-600">
                <DataRow
                  label="邮箱"
                  value="support@circuit.social"
                  copyable
                  onCopied={() => flashStatus("已复制：support@circuit.social")}
                />
                <DataRow
                  label="微信"
                  value="CircuitSocial"
                  copyable
                  onCopied={() => flashStatus("已复制：CircuitSocial")}
                />
                <DataRow
                  label="Telegram"
                  value="@CircuitSocial"
                  copyable
                  onCopied={() => flashStatus("已复制：@CircuitSocial")}
                />
              </div>
            </ModalCard>
          )}

          {modal === "tenant-admin" && (
            <ModalCard
              title="应用配置"
              subtitle="创建租户应用并维护域名白名单"
              actions={
                <button
                  type="button"
                  onClick={() => void createTenantApp()}
                  disabled={busy === "tenant-create" || !tenantAppName.trim()}
                  className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {busy === "tenant-create" ? "创建中..." : "创建应用"}
                </button>
              }
            >
              <div className="space-y-3">
                <LabeledField label="应用名称">
                  <Input
                    value={tenantAppName}
                    onChange={setTenantAppName}
                    placeholder="例如 Circuit Demo"
                  />
                </LabeledField>
                <LabeledField label="回调地址（可选）">
                  <Input
                    value={tenantCallbackUrl}
                    onChange={setTenantCallbackUrl}
                    placeholder="https://demo.example.com/callback"
                  />
                </LabeledField>
                <LabeledField label="链策略">
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
                </LabeledField>

                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
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
                  {tenantApps
                    .filter((app) => {
                      const keyword = tenantFilterKeyword.trim().toLowerCase();
                      const keywordMatched = keyword ? app.name.toLowerCase().includes(keyword) : true;
                      const chainMatched =
                        tenantFilterChain === "all"
                          ? true
                          : app.chainPolicy.includes(tenantFilterChain);
                      return keywordMatched && chainMatched;
                    })
                    .map((app) => (
                    <div key={app.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <Input
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
                        <Input
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
                        <Input
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
                        域名白名单：{app.domains.length ? app.domains.map((item) => item.domain).join(", ") : "暂无"}
                      </div>
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                        <div className="text-[11px] font-medium text-slate-500">租户密钥</div>
                        <div className="mt-1 text-[11px] text-slate-600">
                          {app.keys
                            .map((item) => `${item.keyId.slice(0, 10)}...(${item.status})`)
                            .join(", ")}
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
                          <Input
                            value={tenantEditBrandName[app.id] ?? ""}
                            onChange={(value) =>
                              setTenantEditBrandName((previous) => ({ ...previous, [app.id]: value }))
                            }
                            placeholder="品牌展示名（可选）"
                          />
                          <Input
                            value={tenantEditBrandTheme[app.id] ?? ""}
                            onChange={(value) =>
                              setTenantEditBrandTheme((previous) => ({ ...previous, [app.id]: value }))
                            }
                            placeholder="主题色，例如 #22c55e"
                          />
                          <Input
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
                  {!tenantApps.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                      暂无应用，请先创建你的第一个租户应用。
                    </div>
                  )}
                  {tenantApps.length > 0 &&
                    !tenantApps.some((app) => {
                      const keyword = tenantFilterKeyword.trim().toLowerCase();
                      const keywordMatched = keyword ? app.name.toLowerCase().includes(keyword) : true;
                      const chainMatched =
                        tenantFilterChain === "all"
                          ? true
                          : app.chainPolicy.includes(tenantFilterChain);
                      return keywordMatched && chainMatched;
                    }) && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                        暂无符合筛选条件的应用。
                      </div>
                    )}
                </div>
              </div>
            </ModalCard>
          )}
        </Overlay>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-4">
      <div className="rounded-[32px] border border-white/60 bg-white/85 px-6 py-8 text-center shadow-panel backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-jade/10">
          <Sparkles className="h-6 w-6 text-jade-deep" />
        </div>
        <div className="mt-4 font-[var(--font-display)] text-2xl font-bold text-slate-900">
          Circuit Social
        </div>
        <div className="mt-2 text-sm text-slate-500">正在建立链上会话...</div>
      </div>
    </main>
  );
}

function TopBar({
  tab,
  requestCount,
  onOpenMenu
}: {
  tab: TabKey;
  requestCount: number;
  onOpenMenu: () => void;
}) {
  const titleMap: Record<TabKey, string> = {
    chats: "聊天",
    contacts: "通讯录",
    discover: "发现",
    me: "我的"
  };

  return (
    <header className="relative z-10 flex items-center justify-between border-b border-white/70 px-4 py-4">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Circuit</div>
        <div className="font-[var(--font-display)] text-2xl font-bold tracking-[-0.05em] text-slate-950">
          {titleMap[tab]}
        </div>
      </div>
      {tab === "contacts" ? (
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="打开通讯录动作"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-soft"
        >
          <CirclePlus className="h-5 w-5" />
          {requestCount > 0 && (
            <span className="absolute right-0 top-0 inline-flex min-w-5 items-center justify-center rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {requestCount}
            </span>
          )}
        </button>
      ) : (
        <div className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/70 bg-white/80 px-4 text-xs font-medium text-slate-500 shadow-soft">
          {tab === "discover" ? "Moments" : "EVM"}
        </div>
      )}
    </header>
  );
}

function ChatRoom(props: {
  conversation: ConversationSummary;
  messages: MessageView[];
  onBack: () => void;
  onSend: () => void;
  draft: string;
  setDraft: (value: string) => void;
  members: GroupMember[];
  role: "owner" | "member";
  mentions: number[];
  setMentions: (value: number[]) => void;
  groupManageOpen: boolean;
  setGroupManageOpen: (value: boolean) => void;
  onKick: (memberId: number) => void;
  onMute: (member: GroupMember) => void;
  onLeaveGroup: () => void;
  onCopyInviteCode: () => void;
  encryptionEnabled: boolean;
  encryptionFallback: boolean;
  busy: boolean;
}) {
  const canQuickManageFromAvatar =
    props.conversation.kind === "group" && props.role === "owner";
  const [memberActionTarget, setMemberActionTarget] = useState<GroupMember | null>(null);
  const [memberProfileOpen, setMemberProfileOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiList = ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "🥳", "😎", "🤔", "😭", "😡", "👍", "👏", "🙏", "🎉", "🔥", "❤️"];
  const mentionMatch =
    props.conversation.kind === "group"
      ? props.draft.match(/(?:^|\s)@([^\s@]*)$/)
      : null;
  const mentionKeyword = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionCandidates =
    mentionKeyword === null
      ? []
      : props.members
          .filter((member) => member.nickname.toLowerCase().includes(mentionKeyword))
          .slice(0, 6);

  function insertMention(member: GroupMember) {
    if (!props.mentions.includes(member.id)) {
      props.setMentions([...props.mentions, member.id]);
    }
    const nextDraft = props.draft.replace(
      /(?:^|\s)@([^\s@]*)$/,
      (fullMatch) => `${fullMatch.startsWith(" ") ? " " : ""}@${member.nickname} `
    );
    props.setDraft(nextDraft);
  }

  return (
    <div className="relative z-10 flex h-full flex-col">
      <header className="relative z-20 flex items-center justify-between border-b border-white/70 px-4 py-4">
        <button
          type="button"
          onClick={props.onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
          返回
        </button>
        <div className="text-center">
          <div className="font-[var(--font-display)] text-xl font-bold tracking-[-0.04em] text-slate-950">
            {props.conversation.title}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {props.conversation.kind === "group" ? "group room" : "direct line"}
          </div>
        </div>
        {props.conversation.kind === "group" ? (
          <button
            type="button"
            onClick={() => props.setGroupManageOpen(!props.groupManageOpen)}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 shadow-soft"
          >
            群管理
          </button>
        ) : (
          <div className="w-14" />
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {props.conversation.kind === "group" && props.messages.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-500">
                还没有消息，打个招呼吧
              </div>
            </div>
          ) : (
            props.messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.mine ? "justify-end" : "justify-start")}
              >
                {!message.mine && (
                  <button
                    type="button"
                    onClick={() => {
                      const member = props.members.find((item) => item.id === message.sender.id);
                      if (!member) return;
                      setMemberActionTarget(member);
                      setMemberProfileOpen(false);
                    }}
                    className="cursor-pointer"
                    aria-label={`查看成员 ${message.sender.nickname} 操作`}
                  >
                    <Avatar
                      label={message.sender.nickname}
                      image={message.sender.avatarUrl}
                      tone="emerald"
                      size="sm"
                    />
                  </button>
                )}
                <div className={cn("max-w-[78%]", message.mine ? "order-first" : "")}>
                  {!message.mine && (
                    <div className="mb-1 px-1 text-[11px] text-slate-400">
                      {message.sender.nickname}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-[24px] px-4 py-3 text-sm leading-6 shadow-soft",
                      message.mine
                        ? "bg-jade text-ink"
                        : "border border-white/70 bg-white/90 text-slate-700"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.mentionUserIds.length > 0 && (
                    <div className="mt-1 px-1 text-[11px] text-sky-600">
                      提及 {message.mentionUserIds.length} 人
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {props.mentions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/60 px-4 py-3 text-xs text-slate-600">
          {props.members
            .filter((member) => props.mentions.includes(member.id))
            .map((member) => (
              <span
                key={member.id}
                className="rounded-full bg-sky px-3 py-1 font-medium text-slate-700"
              >
                @{member.nickname}
              </span>
            ))}
        </div>
      )}

      <div className="border-t border-white/70 px-4 py-4">
        {props.encryptionEnabled && (
          <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            已启用端到端加密聊天
          </div>
        )}
        {props.encryptionFallback && (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            当前会话部分成员未启用加密，消息以普通模式发送。
          </div>
        )}
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => setEmojiOpen((previous) => !previous)}
            aria-label="打开表情面板"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg"
          >
            😊
          </button>
          <div className="relative flex-1">
            <input
              value={props.draft}
              onChange={(event) => props.setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  props.onSend();
                }
              }}
              placeholder={props.conversation.kind === "group" ? "发送消息，输入 @ 提及群友" : "发送消息"}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-jade/40 focus:bg-white"
            />
            {mentionCandidates.length > 0 && (
              <div className="absolute bottom-14 left-0 right-0 z-20 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
                {mentionCandidates.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => insertMention(member)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                  >
                    <Avatar label={member.nickname} image={member.avatarUrl} tone="emerald" size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{member.nickname}</div>
                      <div className="truncate text-xs text-slate-500">
                        {shortAddress(member.primaryWalletAddress)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {emojiOpen && (
              <div className="absolute bottom-14 left-0 z-20 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
                <div className="grid grid-cols-6 gap-1">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => props.setDraft(`${props.draft}${emoji}`)}
                      className="rounded-lg px-1 py-1 text-lg transition hover:bg-slate-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={props.onSend}
            aria-label="发送消息"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-jade text-ink"
          >
            {props.busy ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {props.groupManageOpen && props.conversation.kind === "group" && (
        <div className="absolute inset-x-3 bottom-24 rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-panel backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">群管理</div>
              <div className="text-xs text-slate-500">查看成员、禁言、移出和群号信息</div>
            </div>
            <button
              type="button"
              onClick={() => props.setGroupManageOpen(false)}
              aria-label="关闭群成员与提及"
              className="rounded-full bg-slate-100 p-2 text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {props.members.map((member) => {
              const muted =
                member.mutedUntil && new Date(member.mutedUntil).getTime() > Date.now();
              return (
                <div
                  key={member.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      label={member.nickname}
                      image={member.avatarUrl}
                      tone="emerald"
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-semibold text-slate-900">
                          {member.nickname}
                        </div>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {member.role}
                        </span>
                        {muted && (
                          <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-semibold text-coral">
                            muted
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {shortAddress(member.primaryWalletAddress)}
                      </div>
                    </div>
                    {props.role === "owner" && member.role !== "owner" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => props.onMute(member)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {muted ? "解禁" : "禁言"}
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onKick(member.id)}
                          className="rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-[11px] font-medium text-coral"
                        >
                          移出
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={props.onCopyInviteCode}
              disabled={!props.conversation.inviteCode}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              群号：{props.conversation.inviteCode ?? "—"}
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={props.onLeaveGroup}
              className="rounded-full border border-coral/30 bg-coral/10 px-4 py-2 text-xs font-semibold text-coral"
            >
              退出群聊
            </button>
          </div>
        </div>
      )}

      {memberActionTarget && props.conversation.kind === "group" && (
        <div className="absolute inset-x-3 bottom-24 rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-panel backdrop-blur">
          {!memberProfileOpen ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    label={memberActionTarget.nickname}
                    image={memberActionTarget.avatarUrl}
                    tone="emerald"
                    size="sm"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{memberActionTarget.nickname}</div>
                    <div className="text-xs text-slate-500">成员操作</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberActionTarget(null)}
                  aria-label="关闭成员操作"
                  className="rounded-full bg-slate-100 p-2 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!props.mentions.includes(memberActionTarget.id)) {
                      props.setMentions([...props.mentions, memberActionTarget.id]);
                    }
                    const mentionToken = `@${memberActionTarget.nickname} `;
                    if (!props.draft.includes(mentionToken)) {
                      props.setDraft(`${mentionToken}${props.draft}`.trimStart());
                    }
                    setMemberActionTarget(null);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Call
                </button>
                <button
                  type="button"
                  onClick={() => setMemberProfileOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  个人资料
                </button>
                {canQuickManageFromAvatar && memberActionTarget.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onMute(memberActionTarget);
                      setMemberActionTarget(null);
                    }}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
                  >
                    {memberActionTarget.mutedUntil &&
                    new Date(memberActionTarget.mutedUntil).getTime() > Date.now()
                      ? "解禁"
                      : "禁言"}
                  </button>
                )}
                {canQuickManageFromAvatar && memberActionTarget.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onKick(memberActionTarget.id);
                      setMemberActionTarget(null);
                    }}
                    className="rounded-2xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-medium text-coral"
                  >
                    移除群聊
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">个人资料</div>
                <button
                  type="button"
                  onClick={() => setMemberProfileOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  返回
                </button>
              </div>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    label={memberActionTarget.nickname}
                    image={memberActionTarget.avatarUrl}
                    tone="emerald"
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {memberActionTarget.nickname}
                    </div>
                    <div className="text-xs text-slate-500">
                      {memberActionTarget.role === "owner" ? "群主" : "群成员"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="rounded-2xl bg-white px-3 py-2">
                    用户 ID：{memberActionTarget.id}
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 break-all">
                    钱包：{memberActionTarget.primaryWalletAddress}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Overlay({
  open,
  onClose,
  children
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-slate-950/25 p-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="关闭遮罩"
      />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

function MenuSheet({
  title,
  actions
}: {
  title: string;
  actions: Array<{
    label: string;
    description: string;
    badge?: number;
    onClick: () => void;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 p-3 shadow-panel backdrop-blur">
      <div className="px-3 py-2 text-sm font-semibold text-slate-500">{title}</div>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex w-full items-center justify-between rounded-3xl bg-slate-50 px-4 py-4 text-left"
          >
            <div>
              <div className="font-semibold text-slate-900">{action.label}</div>
              <div className="text-xs text-slate-500">{action.description}</div>
            </div>
            <div className="flex items-center gap-2">
              {action.badge ? (
                <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-white">
                  {action.badge}
                </span>
              ) : null}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModalCard({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 p-5 shadow-panel backdrop-blur">
      <div>
        <div className="font-[var(--font-display)] text-2xl font-bold tracking-[-0.04em] text-slate-950">
          {title}
        </div>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      <div className="mt-4">{children}</div>
      {actions ? <div className="mt-5">{actions}</div> : null}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-white/70 bg-white/85 p-3.5 shadow-soft backdrop-blur">
      {children}
    </section>
  );
}

function HeroCard({
  title,
  description,
  tone = "light"
}: {
  title: string;
  description: string;
  tone?: "light" | "dark";
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[22px] border p-4 shadow-soft",
        tone === "dark"
          ? "border-slate-900/10 bg-slate-950 text-white"
          : "border-white/70 bg-gradient-to-br from-white/95 via-white/90 to-jade/10"
      )}
    >
      <div
        className={cn(
          "text-xs uppercase tracking-[0.22em]",
          tone === "dark" ? "text-white/60" : "text-slate-500"
        )}
      >
        Circuit Notes
      </div>
      <div className="mt-2 font-[var(--font-display)] text-[30px] font-bold tracking-[-0.06em]">
        {title}
      </div>
      <p className={cn("mt-2 max-w-[28ch] text-sm leading-6", tone === "dark" ? "text-white/70" : "text-slate-600")}>
        {description}
      </p>
    </section>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{hint}</div>
    </div>
  );
}

function Avatar({
  label,
  image,
  tone,
  size = "md"
}: {
  label: string;
  image: string | null;
  tone: "emerald" | "sky";
  size?: "sm" | "md" | "lg";
}) {
  const map = {
    sm: "h-9 w-9 text-sm",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-xl"
  };
  const bg = tone === "emerald" ? "from-jade to-emerald-700" : "from-sky-300 to-sky-500";
  const src = buildAssetUrl(image);
  if (src) {
    return <img src={src} alt="" className={cn("shrink-0 rounded-2xl object-cover", map[size])} />;
  }
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-semibold text-white",
        bg,
        map[size]
      )}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

function TabButton({
  active,
  label,
  icon,
  badge,
  dot,
  onClick
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-medium transition",
        active ? "bg-jade/15 text-jade-deep" : "text-slate-400"
      )}
    >
      {dot ? (
        <>
          <span className="absolute right-3.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="absolute right-3.5 top-1.5 h-2.5 w-2.5 animate-ping rounded-full bg-red-400" />
        </>
      ) : null}
      {badge ? (
        <span className="absolute right-4 top-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}

function Input({
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
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-jade/40 focus:bg-white"
    />
  );
}

function LabeledField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      {children}
    </label>
  );
}

function DataRow({
  label,
  value,
  copyable,
  onCopied
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopied?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-1 break-all text-sm text-slate-700">{value}</div>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard.writeText(value).then(() => {
              onCopied?.();
            })
          }
          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-soft">
        {icon}
      </div>
      <div className="mt-3 font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>
    </div>
  );
}

function AdBanner({
  slot,
  title,
  description,
  compact
}: {
  slot: string;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-[26px] border border-amber-200/70 bg-[linear-gradient(180deg,#fff8e8_0%,#fff3dd_100%)] p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            AD · {slot}
          </div>
          <div className="mt-1 font-semibold text-amber-950">{title}</div>
          <div className="mt-1 text-xs text-amber-900/80">{description}</div>
        </div>
        <button
          type="button"
          className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800"
        >
          查看
        </button>
      </div>
      {!compact && (
        <div className="mt-3 h-16 rounded-2xl border border-amber-200/70 bg-white/65" />
      )}
    </section>
  );
}
