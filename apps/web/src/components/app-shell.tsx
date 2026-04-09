"use client";

import {
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  CirclePlus,
  Copy,
  ImagePlus,
  Heart,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Pin,
  Pencil,
  MessageCircle,
  Reply,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
  ExternalLink
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage
} from "wagmi";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import { webConfig } from "@/lib/config";
import { ensureLocalKeyPair } from "@/lib/e2ee";
import type {
  ConversationSummary,
  DiscoverHotGroupRow,
  FriendRequest,
  GroupMember,
  MessageView,
  MomentCommentView,
  MomentView,
  SessionUserPayload,
  TabKey,
  UploadAsset,
  WalletAccount
} from "@/lib/types";
import { CircuitKnotLogo } from "@/components/circuit-knot-logo";
import { ContactsTab } from "@/components/contacts-tab";
import { DiscoverTab } from "@/components/discover-tab";
import { MeTab } from "@/components/me-tab";
import { ChatsTab } from "@/components/chats-tab";
import { BottomTabNav } from "@/components/bottom-tab-nav";
import { AppModals } from "@/components/app-modals";
import { Overlay } from "@/components/overlay";
import { LoadingScreen } from "@/components/loading-screen";
import { TopBar } from "@/components/top-bar";
import { ChatComposer } from "@/components/chat-composer";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatGroupPanels } from "@/components/chat-group-panels";
import { ChatDecisionPanel } from "@/components/chat-decision-panel";
import { ChatOverlays } from "@/components/chat-overlays";
import { ChatRoomHeader } from "@/components/chat-room-header";
import {
  CONCIERGE_DECISION_TREE,
  type DecisionAction,
  type DecisionContext,
  type RecentDecisionPath
} from "@/components/chat-decision-tree";
import {
  buildAssetUrl,
  cn,
  connectorEnvHint,
  formatTime,
  getAddressExplorerUrl,
  getExplorerBaseUrlByChainId,
  isOfficialAccount,
  shortAddress
} from "@/components/app-shell-utils";
import {
  filterConversationsByQuery,
  filterFriendsByQuery,
  filterGroupConversationsByQuery,
  getTodayMomentsCount,
  pickGroupConversations
} from "@/components/app-shell-filters";
import {
  coerceSitePublic,
  defaultSitePublic,
  isDiscoverHotBoardVisible,
  type SitePublicConfig
} from "@/components/site-public-config";
import { useNotifications } from "@/components/use-notifications";
import { useConversationState } from "@/components/use-conversation-state";
import { useRealtimeSync } from "@/components/use-realtime-sync";
import { useConversationSync } from "@/components/use-conversation-sync";
import { useOpenConversation } from "@/components/use-open-conversation";
import { useDiscoverNavigation } from "@/components/use-discover-navigation";
import { useAppBootstrap } from "@/components/use-app-bootstrap";
import { useAuthActions } from "@/components/use-auth-actions";
import { useSocialActions } from "@/components/use-social-actions";
import { useMessageActions } from "@/components/use-message-actions";
import { useMomentActions } from "@/components/use-moment-actions";
import { useProfileActions } from "@/components/use-profile-actions";
import { useGroupActions } from "@/components/use-group-actions";
import { useMomentInteractions } from "@/components/use-moment-interactions";
import { useMomentComments } from "@/components/use-moment-comments";
import { AdBanner } from "@/components/ui/ad-banner";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";
import { HeroCard } from "@/components/ui/hero-card";
import { Input } from "@/components/ui/input";
import { LabeledField } from "@/components/ui/labeled-field";
import { SectionTitle } from "@/components/ui/section-title";

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
  | "contact";

type MomentUploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  uploadId: number | null;
};

type MomentReplyTarget = {
  commentId: number;
  nickname: string;
};

export function AppShell(props?: { initialTab?: TabKey; initialContactsView?: "contacts" | "notifications" }) {
  const [session, setSession] = useState<SessionUserPayload | null | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>(props?.initialTab ?? "chats");
  const [contactsView, setContactsView] = useState<"contacts" | "notifications">(
    props?.initialContactsView ?? "contacts"
  );
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
  const [momentComments, setMomentComments] = useState<Record<number, MomentCommentView[]>>({});
  const [expandedMomentComments, setExpandedMomentComments] = useState<Record<number, boolean>>({});
  const [momentCommentDrafts, setMomentCommentDrafts] = useState<Record<number, string>>({});
  const [momentReplyTargets, setMomentReplyTargets] = useState<Record<number, MomentReplyTarget | null>>({});
  const [momentCommentsLoading, setMomentCommentsLoading] = useState<Record<number, boolean>>({});
  const [friendTarget, setFriendTarget] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [contactsGroupExpanded, setContactsGroupExpanded] = useState(true);
  const [contactsFriendExpanded, setContactsFriendExpanded] = useState(true);
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const [walletsExpanded, setWalletsExpanded] = useState(false);
  const [discoverView, setDiscoverView] = useState<"menu" | "moments">("menu");
  const [discoverHot, setDiscoverHot] = useState<{
    windowHours: number;
    hotMoments: Array<{ id: number; score: number; reason: string; moment: MomentView }>;
    hotGroups: DiscoverHotGroupRow[];
    recommendedUsers: Array<{ id: number; score: number; reason: string; user: SessionUserPayload["user"] }>;
  } | null>(null);
  const [discoverHotLoading, setDiscoverHotLoading] = useState(false);
  const [momentsLoading, setMomentsLoading] = useState(false);
  const [points, setPoints] = useState<{ total: number; ledger: any[] } | null>(null);
  const [tasks, setTasks] = useState<any[] | null>(null);
  /** 「我的」内二级页：积分与任务详情 */
  const [meSubView, setMeSubView] = useState<"main" | "pointsTasks">("main");
  const [status, setStatus] = useState<string>("");
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [themeMode, setThemeMode] = useState<"system" | "light" | "dark">("system");
  const [chatsNotesHidden, setChatsNotesHidden] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [sitePublic, setSitePublic] = useState<SitePublicConfig>(defaultSitePublic());
  const [loginChainType, setLoginChainType] = useState<"evm" | "solana">("evm");
  const [loginSignPreviewOpen, setLoginSignPreviewOpen] = useState(true);
  const [loginSheetOpen, setLoginSheetOpen] = useState(false);
  const [loginSheetDragY, setLoginSheetDragY] = useState(0);
  const loginSheetDragStartYRef = useRef<number | null>(null);
  const loginSheetDraggingRef = useRef(false);
  const loginSheetRef = useRef<HTMLDivElement | null>(null);
  const [loginSheetHeight, setLoginSheetHeight] = useState(0);
  const [bindChainType, setBindChainType] = useState<"evm" | "solana">("evm");
  const [profileAvatarUrlManual, setProfileAvatarUrlManual] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [conversationEncryptionFallback, setConversationEncryptionFallback] = useState<
    Record<number, boolean>
  >({});
  const [conversationEncryptionEnabled, setConversationEncryptionEnabled] = useState<
    Record<number, boolean>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
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
  const t = useCallback(
    (zh: string, en: string) => (locale === "en" ? en : zh),
    [locale]
  );

  const messagesRef = useRef<MessageView[]>([]);
  const activeConversationRef = useRef<ConversationSummary | null>(null);

  const { connectors, connectAsync, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, chain, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const loginExplorerUrl = useMemo(
    () => (address && chain ? getAddressExplorerUrl(chain, address) : null),
    [chain, address]
  );
  const profileExplorerUrl = useMemo(() => {
    if (!session?.user.primaryWalletAddress) return null;
    const base = getExplorerBaseUrlByChainId(session.user.primaryChainId);
    if (!base) return null;
    return `${base}/address/${session.user.primaryWalletAddress}`;
  }, [session?.user.primaryWalletAddress, session?.user.primaryChainId]);
  const connectableConnectors = connectors.filter((connector) => connector.id !== "metaMaskSDK");
  const orderedConnectors = useMemo(() => {
    const list = [...connectableConnectors];
    list.sort((a, b) => {
      const rank = (c: (typeof list)[0]) => {
        const id = c.id.toLowerCase();
        if (id.includes("injected") || id === "io.metamask") return 0;
        if (id.includes("okx")) return 2;
        return 1;
      };
      return rank(a) - rank(b);
    });
    return list;
  }, [connectableConnectors]);
  const selectedConnector =
    connectableConnectors.find((connector) => connector.id === preferredConnectorId) ??
    connectableConnectors[0] ??
    null;
  const { handleSiweLogin, handleLoginPrimaryAction } = useAuthActions({
    connectors,
    connectAsync,
    signMessageAsync,
    isConnected,
    selectedConnector,
    address,
    chain,
    loginChainType,
    bindChainType,
    enableSolanaLogin: sitePublic.enableSolanaLogin,
    setBusy,
    setStatus,
    setSession,
    setTab,
    t
  });

  const flashStatus = useCallback((message: string, durationMs = 1500) => {
    setStatus(message);
    window.setTimeout(() => {
      setStatus((previous) => (previous === message ? "" : previous));
    }, durationMs);
  }, []);

  const {
    unreadNotifications,
    notifications,
    notificationsCursor,
    notificationsLoading,
    loadNotifications,
    refreshUnreadNotifications,
    markAllNotificationsRead,
    resetNotifications,
    incrementUnreadNotifications
  } = useNotifications({ session, t, setStatus });

  const filteredConversations = useMemo(
    () => filterConversationsByQuery(conversations, chatSearchQuery),
    [chatSearchQuery, conversations]
  );

  const contactQuery = contactsSearchQuery.trim().toLowerCase();
  const groupConversations = useMemo(() => pickGroupConversations(conversations), [conversations]);
  const filteredGroupConversations = useMemo(
    () => filterGroupConversationsByQuery(groupConversations, contactQuery),
    [contactQuery, groupConversations]
  );
  const filteredFriends = useMemo(
    () => filterFriendsByQuery(friends, contactQuery),
    [contactQuery, friends]
  );
  const todayMomentsCount = useMemo(() => getTodayMomentsCount(moments), [moments]);

  useEffect(() => {
    if (loginChainType !== "solana") return;
    if (sitePublic.enableSolanaLogin) return;
    setLoginChainType("evm");
  }, [loginChainType, sitePublic.enableSolanaLogin]);

  useEffect(() => {
    if (bindChainType !== "solana") return;
    if (sitePublic.enableSolanaLogin) return;
    setBindChainType("evm");
  }, [bindChainType, sitePublic.enableSolanaLogin]);

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
      const injected = connectableConnectors.find(
        (c) => c.id.toLowerCase().includes("injected") || c.id === "io.metamask"
      );
      setPreferredConnectorId((injected ?? connectableConnectors[0]).id);
    }
  }, [connectableConnectors, preferredConnectorId]);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("cx_locale") as "zh" | "en" | null)
        : null;
    if (saved === "zh" || saved === "en") {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setChatsNotesHidden(window.localStorage.getItem("cx_notes_chats_hidden") === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("cx_theme") as "system" | "light" | "dark" | null;
    if (saved === "system" || saved === "light" || saved === "dark") {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (themeMode === "light" || themeMode === "dark") {
      root.setAttribute("data-theme", themeMode);
      window.localStorage.setItem("cx_theme", themeMode);
      return;
    }
    root.removeAttribute("data-theme");
    window.localStorage.setItem("cx_theme", "system");
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cx_locale", locale);
  }, [locale]);

  useEffect(() => {
    if (modal !== "profile") return;
    setProfileAvatarUrlManual(false);
  }, [modal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!loginSheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLoginSheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [loginSheetOpen]);

  useEffect(() => {
    if (!loginSheetOpen) {
      setLoginSheetDragY(0);
      loginSheetDragStartYRef.current = null;
      loginSheetDraggingRef.current = false;
    }
  }, [loginSheetOpen]);

  useLayoutEffect(() => {
    const node = loginSheetRef.current;
    if (!node) return;
    const measure = () => setLoginSheetHeight(node.offsetHeight || 0);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) return;
    if (typeof window === "undefined") return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = startX <= 24;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      if (deltaX > 16 && Math.abs(deltaX) > Math.abs(deltaY)) {
        event.preventDefault();
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
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
    setMomentsLoading(true);
    try {
      const result = await api.get<{ moments: MomentView[] }>("/moments");
      setMoments(result.moments);
    } finally {
      setMomentsLoading(false);
    }
  }, []);

  const loadDiscoverHot = useCallback(async () => {
    setDiscoverHotLoading(true);
    try {
      const result = await api.get<any>("/discover/hot");
      setDiscoverHot({
        windowHours: result.windowHours ?? 72,
        hotMoments: result.hotMoments ?? [],
        hotGroups: result.hotGroups ?? [],
        recommendedUsers: result.recommendedUsers ?? []
      });
    } finally {
      setDiscoverHotLoading(false);
    }
  }, []);

  const loadPointsAndTasks = useCallback(async () => {
    const [pointsRes, tasksRes] = await Promise.all([api.get<any>("/points"), api.get<any>("/tasks")]);
    setPoints({ total: pointsRes.total ?? 0, ledger: pointsRes.ledger ?? [] });
    setTasks(tasksRes.tasks ?? []);
  }, []);

  const { normalizeMessage, normalizeConversation, loadConversations, mergeMessage } = useConversationState({
    currentUserId,
    secretKey: e2eeKeyPair?.secretKey ?? null,
    setConversations,
    setMessages
  });

  const openHotGroupFromDiscover = useDiscoverNavigation({
    conversations,
    normalizeConversation,
    setConversations,
    setTab,
    setActiveConversation,
    flashStatus,
    setStatus,
    t
  });

  useAppBootstrap({
    hydrateSession,
    setStatus,
    setSession,
    setSitePublic,
    coerceSitePublic,
    session,
    shouldLoadDiscoverHot: isDiscoverHotBoardVisible(sitePublic.discover.hot),
    loadConversations,
    loadContacts,
    loadMoments,
    loadPointsAndTasks,
    loadDiscoverHot
  });

  useEffect(() => {
    if (tab !== "me") setMeSubView("main");
  }, [tab]);

  const mergeMoment = useCallback((moment: MomentView) => {
    setMoments((previous) => {
      if (previous.some((item) => item.id === moment.id)) return previous;
      return [moment, ...previous];
    });
  }, []);

  const { socketRef, socketConnected } = useRealtimeSync({
    session,
    apiOrigin: webConfig.apiOrigin,
    onConversationUpdated: (items) => {
      setConversations(items.map((item) => normalizeConversation(item)));
    },
    onMessageNew: (message) => {
      if (activeConversationRef.current?.id !== message.conversationId) return;
      mergeMessage(message);
    },
    onFriendRequestNew: () => {
      void loadContacts();
    },
    onMomentNew: (moment) => {
      mergeMoment(moment);
    },
    onNotificationNew: () => {
      incrementUnreadNotifications();
    },
    onSessionEnded: resetNotifications
  });

  useEffect(() => {
    void refreshUnreadNotifications();
  }, [refreshUnreadNotifications]);

  useConversationSync({
    session,
    activeConversation,
    socketRef,
    socketConnected,
    messagesRef,
    setMessages,
    normalizeMessage
  });

  const openConversation = useOpenConversation({
    normalizeMessage,
    setBusy,
    setActiveConversation,
    setMessages,
    setSelectedMentions,
    setGroupManageOpen,
    setMessageDraft,
    setGroupMembers,
    setGroupRole,
    setConversationEncryptionEnabled,
    setStatus
  });

  const { logout, submitFriendRequest, answerRequest, createGroup, joinGroup, startDm } =
    useSocialActions({
      disconnect,
      friendTarget,
      groupName,
      joinCode,
      setBusy,
      setStatus,
      setSession,
      setActiveConversation,
      setMessages,
      setFriendTarget,
      setModal,
      setGroupName,
      setJoinCode,
      loadContacts,
      loadConversations,
      openConversation
    });

  const { sendMessage } = useMessageActions({
    activeConversation,
    messageDraft,
    selectedMentions,
    e2eeKeyPair,
    setBusy,
    setConversationEncryptionFallback,
    mergeMessage,
    setMessageDraft,
    setSelectedMentions,
    loadConversations,
    setStatus
  });

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await api.post<{ upload: UploadAsset }>("/uploads/image", formData);
    return result.upload.url;
  }
  const { enqueueMomentUploads, publishMoment } = useMomentActions({
    momentDraft,
    momentFiles,
    setBusy,
    setMomentNotice,
    setMomentDraft,
    setMomentFiles,
    mergeMoment,
    setStatus
  });
  const { saveProfile } = useProfileActions({
    profileForm,
    setBusy,
    setSession,
    setModal,
    setProfileAvatarUrlManual,
    flashStatus,
    setStatus,
    t
  });

  const { kickMember, toggleMute, leaveGroup } = useGroupActions({
    activeConversation,
    setGroupMembers,
    setGroupRole,
    setActiveConversation,
    setMessages,
    loadConversations,
    setStatus
  });
  const { loadMomentComments, submitMomentComment, deleteMomentComment } = useMomentComments({
    momentCommentDrafts,
    momentReplyTargets,
    setMomentCommentsLoading,
    setMomentComments,
    setBusy,
    setMomentCommentDrafts,
    setMomentReplyTargets,
    setExpandedMomentComments,
    setStatus,
    t
  });
  const {
    reportMoment,
    toggleMomentLike,
    toggleMomentCommentLike,
    toggleMomentCommentPin
  } = useMomentInteractions({
    setMoments,
    loadPointsAndTasks,
    shouldLoadDiscoverHot: isDiscoverHotBoardVisible,
    discoverHotConfig: sitePublic.discover.hot,
    loadDiscoverHot,
    loadMomentComments,
    setStatus,
    t
  });

  const countMomentComments = useCallback((items: MomentCommentView[]): number => {
    return items.reduce((total, item) => total + 1 + countMomentComments(item.replies), 0);
  }, []);

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

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <main className="relative h-[100dvh] overflow-hidden bg-[color:var(--login-base)] px-3 py-3 text-[color:var(--login-fg)] sm:px-5 sm:py-6">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "var(--login-bg)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-[520px] -translate-x-1/2 blur-3xl"
          style={{ background: "var(--login-glow)" }}
        />

        <section className="relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[398px] flex-col gap-2 sm:max-w-[406px] sm:gap-3">
          <div className="shrink-0 pt-0.5">
            <div className="mb-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setThemeMode((previous) =>
                    previous === "system" ? "light" : previous === "light" ? "dark" : "system"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg)] px-2.5 py-1 text-xs font-semibold text-[color:var(--login-glass-text)]"
                aria-label={t("切换主题", "Toggle theme")}
                title={
                  themeMode === "system"
                    ? t("主题：跟随系统", "Theme: System")
                    : themeMode === "light"
                      ? t("主题：白天", "Theme: Light")
                      : t("主题：黑夜", "Theme: Dark")
                }
              >
                {themeMode === "system" ? <Monitor className="h-3.5 w-3.5" /> : null}
                {themeMode === "light" ? <Sun className="h-3.5 w-3.5" /> : null}
                {themeMode === "dark" ? <Moon className="h-3.5 w-3.5" /> : null}
                <span className="text-[11px] font-bold tracking-tight">
                  {themeMode === "system"
                    ? t("系统", "System")
                    : themeMode === "light"
                      ? t("白天", "Light")
                      : t("黑夜", "Dark")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLocale((previous) => (previous === "zh" ? "en" : "zh"))}
                className="rounded-full border border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--login-glass-text)]"
              >
                {locale === "zh" ? "English" : "中文"}
              </button>
            </div>
          </div>
          <div
            data-testid="login-brand-block"
            className="shrink-0 rounded-[24px] border border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg)] px-3 py-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:rounded-[28px] sm:px-4 sm:py-3.5 sm:shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-[20px] border border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg-strong)] p-1.5 shadow-[0_16px_28px_rgba(0,0,0,0.14)] sm:rounded-[24px] sm:p-2 sm:shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
                <div className="rounded-[16px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(214,223,228,0.92)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:rounded-[20px] sm:p-2.5">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#3a454d_0%,#20272d_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.22)] sm:h-[62px] sm:w-[62px] sm:rounded-[18px] sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_30px_rgba(0,0,0,0.25)]">
                    <div className="relative flex h-[35px] w-[42px] items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#ffffff_0%,#eef2f6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-[42px] sm:w-[50px] sm:rounded-[14px]">
                      <CircuitKnotLogo className="h-[28px] w-[28px] sm:h-[34px] sm:w-[34px]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="mb-1 hidden rounded-full border border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--login-glass-muted)] sm:inline-flex">
                  Secure Entry
                </div>
                <h1 className="text-[25px] font-black leading-none tracking-[-0.06em] text-[color:var(--login-glass-text)] sm:text-[32px]">
                  Circuit Social
                </h1>
                <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-[color:var(--login-glass-muted)] sm:mt-1.5 sm:text-[11px] sm:tracking-[0.22em]">
                  {t("链上身份 · 安全会话", "On-chain Identity · Secure Session")}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] pb-24 sm:pb-1">
            <div className="w-full rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(241,244,246,0.95)_100%)] p-3 text-slate-900 shadow-[0_26px_60px_rgba(0,0,0,0.22)] sm:rounded-[30px] sm:p-4 sm:shadow-[0_34px_80px_rgba(0,0,0,0.26)]">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="rounded-[18px] bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.05)_100%)] px-3 py-2.5 sm:rounded-[20px] sm:px-3.5 sm:py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-[11px] sm:tracking-[0.24em]">
                    {t("钱包登录", "Wallet Sign-In")}
                  </div>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-700 sm:text-[14px] sm:leading-relaxed">
                    {t(
                      "使用钱包一键连接，签名即可完成注册与登录，无需额外密码。",
                      "Connect wallet once and sign to finish registration and login."
                    )}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-600 sm:text-[12px]">
                    <li className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jade/15">
                        <Check className="h-3 w-3 text-jade" strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="font-semibold text-slate-800">{t("去中心化身份", "Decentralized ID")}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {t("链上身份可在多场景复用，无需平台账户密码。", "Reuse your on-chain identity across apps—no platform password.")}
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jade/15">
                        <Check className="h-3 w-3 text-jade" strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="font-semibold text-slate-800">{t("一次签名建会话", "One sign, one session")}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {t("签名一次即可建立安全会话，无需反复连接。", "Sign once to establish a session—no repeated connects.")}
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jade/15">
                        <Check className="h-3 w-3 text-jade" strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="font-semibold text-slate-800">{t("EVM 多链", "Multi-chain EVM")}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {t("支持主流 EVM 网络，切换网络后重新连接即可。", "Supports major EVM networks; reconnect after switching.")}
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>

                <div
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50 px-2 py-2"
                  role="navigation"
                  aria-label={t("登录步骤", "Sign-in steps")}
                >
                  {(
                    [
                      {
                        n: 1,
                        key: "net",
                        label: t("网络", "Network"),
                        done: true,
                        current: false
                      },
                      {
                        n: 2,
                        key: "conn",
                        label: t("连接", "Connect"),
                        done: isConnected,
                        current: !isConnected
                      },
                      {
                        n: 3,
                        key: "sign",
                        label: t("签名", "Sign"),
                        done: false,
                        current: isConnected
                      }
                    ] as const
                  ).map((step, index) => (
                    <div key={step.key} className="flex min-w-0 flex-1 items-center gap-1.5">
                      {index > 0 ? (
                        <div
                          className={cn(
                            "hidden h-px w-2 shrink-0 sm:block",
                            step.done || step.current ? "bg-jade/50" : "bg-slate-200"
                          )}
                          aria-hidden
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                            step.done
                              ? "bg-jade text-white"
                              : step.current
                                ? "bg-slate-900 text-white ring-2 ring-jade/40"
                                : "bg-slate-200 text-slate-500"
                          )}
                        >
                          {step.done && step.n < 3 ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.n}
                        </div>
                        <span
                          className={cn(
                            "max-w-full truncate text-center text-[9px] font-semibold uppercase tracking-wide",
                            step.current || step.done ? "text-slate-800" : "text-slate-400"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[18px] border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {t("网络与钱包", "Network & wallet")}
                  </div>
                  <div className="mt-2 rounded-2xl bg-slate-200/70 p-1 shadow-inner">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setLoginChainType("evm")}
                        className={cn(
                          "rounded-[12px] py-2 text-xs font-bold transition",
                          loginChainType === "evm"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        EVM
                      </button>
                      <button
                        type="button"
                        disabled={!sitePublic.enableSolanaLogin}
                        onClick={() => {
                          if (!sitePublic.enableSolanaLogin) return;
                          setLoginChainType("solana");
                        }}
                        className={cn(
                          "relative inline-flex items-center justify-center gap-1 rounded-[12px] py-2 text-xs font-bold transition",
                          !sitePublic.enableSolanaLogin &&
                            "cursor-not-allowed bg-slate-100/80 text-slate-400",
                          sitePublic.enableSolanaLogin &&
                            (loginChainType === "solana"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800")
                        )}
                      >
                        {!sitePublic.enableSolanaLogin ? <Lock className="h-3 w-3" /> : null}
                        Solana
                        {!sitePublic.enableSolanaLogin ? (
                          <span className="absolute -right-1 -top-1.5 rounded-full bg-slate-600 px-1.5 py-px text-[8px] font-bold uppercase text-white">
                            {t("即将支持", "Soon")}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  </div>
                  {!sitePublic.enableSolanaLogin ? (
                    <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
                      {t(
                        "Solana 入口筹备中，请暂时使用 EVM 登录。",
                        "Solana is coming soon—please use EVM for now."
                      )}
                    </p>
                  ) : null}

                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("钱包来源", "Wallet")}
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {orderedConnectors.map((connector) => {
                      const hint = connectorEnvHint(connector, t);
                      return (
                        <button
                          key={connector.id}
                          type="button"
                          data-testid={`wallet-option-${connector.id}`}
                          onClick={() => {
                            setPreferredConnectorId(connector.id);
                            setLoginSheetOpen(true);
                          }}
                          className={cn(
                            "min-w-0 rounded-xl border-2 border-dashed px-2 py-2 text-left text-[12px] font-semibold transition sm:py-2.5 sm:text-[13px]",
                            selectedConnector?.id === connector.id
                              ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_22px_rgba(15,23,42,0.2)]"
                              : "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <span className="block truncate">{connector.name}</span>
                          {hint ? (
                            <span
                              className={cn(
                                "mt-0.5 block truncate text-[9px] font-medium",
                                selectedConnector?.id === connector.id ? "text-white/75" : "text-slate-400"
                              )}
                            >
                              {hint}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/95 px-2.5 py-2 text-[11px] leading-snug text-amber-950/90"
                    role="note"
                  >
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <span className="font-semibold text-amber-900">{t("安全提示", "Security")}</span>
                      <span className="text-amber-900/85">
                        {" "}
                        {t(
                          "建议使用测试钱包；签名前请核对浏览器地址栏域名与链 ID。",
                          "Use a test wallet when possible; verify the site domain and chain ID before signing."
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Desktop primary action (mobile uses bottom sheet) */}
                  <div className="mt-3 hidden sm:block">
                    <button
                      type="button"
                      data-testid="login-primary-button-desktop"
                      disabled={
                        (loginChainType === "solana" && !sitePublic.enableSolanaLogin) ||
                        ((!isConnected && !selectedConnector) || connectPending || busy === "login")
                      }
                      onClick={() => void handleLoginPrimaryAction()}
                      className="inline-flex w-full items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#33ea98_0%,#1dcc7b_56%,#14b66b_100%)] px-4 py-2.5 text-[14px] font-black text-[#08341f] shadow-[0_14px_26px_rgba(18,199,118,0.22),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:brightness-110 hover:shadow-[0_18px_32px_rgba(18,199,118,0.28)] active:scale-[0.99] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
                    >
                      {connectPending
                        ? t("钱包连接中...", "Connecting wallet...")
                        : busy === "login"
                          ? t("签名中...", "Signing...")
                          : loginChainType === "solana" && !sitePublic.enableSolanaLogin
                            ? t("Solana 入口未启用", "Solana login disabled")
                            : isConnected
                              ? t("确认签名登录", "Sign in now")
                              : t("使用", "Connect with") +
                                ` ${selectedConnector?.name ?? t("钱包", "wallet")}`}
                    </button>
                  </div>
                </div>

                <div className="hidden rounded-[18px] bg-[linear-gradient(180deg,#0f1720_0%,#08131b_100%)] px-3 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:block sm:rounded-[20px] sm:px-3.5 sm:py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-black tracking-[-0.04em] sm:text-[15px]">
                        {isConnected && address
                          ? shortAddress(address)
                          : selectedConnector?.name ?? t("选择钱包", "Select wallet")}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
                        {isConnected
                          ? chain?.name ?? t("已连接", "Connected")
                          : t("等待钱包授权", "Awaiting wallet authorization")}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isConnected && address ? (
                        <>
                          <button
                            type="button"
                            aria-label={t("复制地址", "Copy address")}
                            onClick={() =>
                              void navigator.clipboard.writeText(address).then(() => {
                                flashStatus(t("已复制地址", "Address copied"));
                              })
                            }
                            className="rounded-full border border-white/15 bg-white/10 p-1.5 text-white/80 transition hover:bg-white/15"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {loginExplorerUrl ? (
                            <a
                              href={loginExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={t("在区块浏览器查看", "View on explorer")}
                              className="rounded-full border border-white/15 bg-white/10 p-1.5 text-white/80 transition hover:bg-white/15"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </>
                      ) : null}
                      <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        {isConnected
                          ? t("可签名", "Ready to sign")
                          : t("未连接", "Not connected")}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLoginSignPreviewOpen((open) => !open)}
                    className="mt-2 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[10px] font-semibold text-white/70 transition hover:bg-white/10"
                  >
                    <span>{t("本次签名说明（SIWE）", "Signing preview (SIWE)")}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition",
                        loginSignPreviewOpen ? "rotate-90" : ""
                      )}
                    />
                  </button>
                  {loginSignPreviewOpen ? (
                    <div className="mt-1.5 space-y-1.5 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-white/75">
                      <div>
                        <span className="text-white/45">{t("域名", "Domain")} </span>
                        {typeof window !== "undefined" ? window.location.host : "—"}
                      </div>
                      <div>
                        <span className="text-white/45">{t("地址", "Address")} </span>
                        {isConnected && address ? shortAddress(address) : "—"}
                      </div>
                      <div>
                        <span className="text-white/45">{t("声明", "Statement")} </span>
                        {t(
                          "用于在 Circuit Social 验证身份并建立安全会话，不发起转账。",
                          "Confirms identity for Circuit Social session only—no transfers."
                        )}
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-2 text-[10px] leading-snug text-white/58 sm:text-[11px]">
                    {t(
                      "本次签名仅用于验证身份并创建会话，不会转移资产，也不会读取私钥。",
                      "This signature only proves identity and creates a session—it does not move assets or access your private key."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loginSheetOpen ? (
            <button
              type="button"
              aria-label={t("关闭签名面板", "Close signing sheet")}
              onClick={() => setLoginSheetOpen(false)}
              className="absolute inset-0 z-20 bg-black/35 backdrop-blur-[2px] sm:hidden transition-opacity duration-150"
              style={{
                opacity: Math.max(0, 0.35 * (1 - loginSheetDragY / 180))
              }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(5,9,13,0)_0%,rgba(5,9,13,0.78)_45%,rgba(5,9,13,0.94)_100%)] sm:hidden" />
          <div
            ref={loginSheetRef}
            className="sm:hidden z-30 shrink-0 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1.5 transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: (() => {
                const peekPx = 118; // handle + summary row + padding
                const closedOffset = Math.max(0, (loginSheetHeight || 0) - peekPx);
                const base = loginSheetOpen ? 0 : closedOffset;
                const drag = loginSheetOpen ? loginSheetDragY : Math.min(loginSheetDragY, 120);
                return `translateY(${base + drag}px)`;
              })()
            }}
          >
            <div className="pointer-events-auto rounded-[18px] border border-white/10 bg-white/5 p-2 shadow-[0_14px_36px_rgba(0,0,0,0.26)] backdrop-blur">
              <div
                role="button"
                tabIndex={0}
                aria-label={t("拖动关闭", "Drag to close")}
                onPointerDown={(event) => {
                  loginSheetDraggingRef.current = true;
                  loginSheetDragStartYRef.current = event.clientY;
                  setLoginSheetDragY(0);
                  try {
                    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                onPointerMove={(event) => {
                  if (!loginSheetDraggingRef.current) return;
                  const startY = loginSheetDragStartYRef.current;
                  if (startY == null) return;
                  const delta = event.clientY - startY;
                  if (!loginSheetOpen) {
                    if (delta < -20) {
                      setLoginSheetOpen(true);
                      loginSheetDragStartYRef.current = event.clientY;
                      setLoginSheetDragY(0);
                    }
                    return;
                  }
                  setLoginSheetDragY(Math.max(0, delta));
                }}
                onPointerUp={() => {
                  if (!loginSheetDraggingRef.current) return;
                  loginSheetDraggingRef.current = false;
                  loginSheetDragStartYRef.current = null;
                  if (!loginSheetOpen) {
                    setLoginSheetDragY(0);
                    return;
                  }
                  if (loginSheetDragY > 84) {
                    setLoginSheetOpen(false);
                    return;
                  }
                  setLoginSheetDragY(0);
                }}
                onPointerCancel={() => {
                  loginSheetDraggingRef.current = false;
                  loginSheetDragStartYRef.current = null;
                  setLoginSheetDragY(0);
                }}
                className="mx-auto mb-2 flex h-5 w-16 items-center justify-center rounded-full"
              >
                <div
                  aria-hidden
                  className={cn(
                    "h-1 w-10 rounded-full bg-white/25 transition-opacity duration-200",
                    loginSheetOpen ? "opacity-100" : selectedConnector ? "opacity-40" : "opacity-20"
                  )}
                />
              </div>
              <button
                type="button"
                onClick={() => setLoginSheetOpen((open) => !open)}
                className={cn(
                  "group flex w-full items-center justify-between gap-2 rounded-[14px] border px-3 py-2.5 text-left text-[12px] font-semibold transition",
                  "border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg-strong)] text-[color:var(--login-glass-text)]",
                  "shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:shadow-[0_14px_32px_rgba(0,0,0,0.18)]",
                  "active:scale-[0.995]"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">
                    {isConnected && address
                      ? shortAddress(address)
                      : selectedConnector?.name ?? t("选择钱包", "Select wallet")}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-[color:var(--login-glass-muted)]">
                    {isConnected
                      ? t("钱包已连接，轻触查看签名详情。", "Wallet connected—tap to review signing details.")
                      : t("选择钱包并连接后即可签名登录。", "Choose a wallet and connect to sign in.")}
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--login-glass-border)] bg-[color:var(--login-glass-bg)] px-2 py-0.5 text-[9px] font-bold tracking-wide">
                      {loginSheetOpen ? t("收起", "Collapse") : t("展开", "Expand")}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform text-[color:var(--login-glass-muted)] group-hover:text-[color:var(--login-glass-text)]",
                    loginSheetOpen ? "rotate-90" : ""
                  )}
                />
              </button>

              <div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "mt-1.5 overflow-hidden rounded-[14px] border border-white/15 bg-black/35 px-3 text-[11px] text-white/80 transition-[max-height,opacity,transform] duration-200 ease-out",
                  loginSheetOpen ? "max-h-[520px] opacity-100 translate-y-0 py-2.5" : "max-h-0 opacity-0 translate-y-2 py-0"
                )}
              >
                <div className={cn("space-y-2", loginSheetOpen ? "pointer-events-auto" : "pointer-events-none")}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                        {t("本次签名", "This sign-in")}
                      </div>
                      <div className="mt-0.5 text-[11px]">
                        {t(
                          "仅用于验证身份并创建会话，不会发起转账，也不会读取私钥。",
                          "Used only to prove identity and create a session—no transfers or key access."
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-white/75">
                    <div>
                      <span className="text-white/45">{t("域名", "Domain")} </span>
                      {typeof window !== "undefined" ? window.location.host : "—"}
                    </div>
                    <div>
                      <span className="text-white/45">{t("地址", "Address")} </span>
                      {isConnected && address ? shortAddress(address) : "—"}
                    </div>
                    <div>
                      <span className="text-white/45">{t("声明", "Statement")} </span>
                      {t(
                        "用于在 Circuit Social 验证身份并建立安全会话，不发起转账。",
                        "Confirms identity for Circuit Social session only—no transfers."
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="login-primary-button"
                    disabled={
                      (loginChainType === "solana" && !sitePublic.enableSolanaLogin) ||
                      ((!isConnected && !selectedConnector) || connectPending || busy === "login")
                    }
                    onClick={() => void handleLoginPrimaryAction()}
                    className="inline-flex w-full items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#33ea98_0%,#1dcc7b_56%,#14b66b_100%)] px-4 py-2.5 text-[14px] font-black text-[#08341f] shadow-[0_14px_26px_rgba(18,199,118,0.22),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:brightness-110 hover:shadow-[0_18px_32px_rgba(18,199,118,0.28)] active:scale-[0.99] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
                  >
                    {connectPending
                      ? t("钱包连接中...", "Connecting wallet...")
                      : busy === "login"
                        ? t("签名中...", "Signing...")
                        : loginChainType === "solana" && !sitePublic.enableSolanaLogin
                          ? t("Solana 入口未启用", "Solana login disabled")
                          : isConnected
                            ? t("确认签名登录", "Sign in now")
                            : t("使用", "Connect with") +
                              ` ${selectedConnector?.name ?? t("钱包", "wallet")}`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-2 pt-1 pb-2 text-center text-[11px] text-white/55 sm:text-xs">
            {status ||
              t(
                "建议先用测试网或小额钱包体验，零风险熟悉流程。",
                "Try a testnet or low-balance wallet first—zero risk to explore."
              )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] overflow-x-hidden px-3 py-2">
      <section
        className="relative flex h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.78)] shadow-panel backdrop-blur"
        style={{ touchAction: activeConversation ? "pan-y" : "auto" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-2 h-20 rounded-full bg-jade/10 blur-3xl"
        />
        {activeConversation ? (
          <ChatRoom
            conversation={activeConversation}
            messages={messages}
            locale={locale}
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
            onDecisionAction={(action) => {
              setActiveConversation(null);
              setGroupManageOpen(false);
              setSelectedMentions([]);
              if (action === "profile") {
                setTab("me");
                setModal("profile");
                return;
              }
              if (action === "add-friend") {
                setTab("contacts");
                setModal("add-friend");
                return;
              }
              if (action === "create-group") {
                setTab("contacts");
                setModal("create-group");
                return;
              }
              if (action === "join-group") {
                setTab("contacts");
                setModal("join-group");
                return;
              }
              if (action === "discover") {
                setTab("discover");
                setDiscoverView("menu");
                return;
              }
              if (action === "contacts") {
                setTab("contacts");
                setModal("contacts-menu");
              }
            }}
            decisionContext={{
              profileIncomplete: Boolean(
                !session.user.nickname?.trim() || !session.user.bio?.trim() || !session.user.didUri
              ),
              friendCount: friends.length,
              groupCount: conversations.filter((item) => item.kind === "group").length
            }}
          />
        ) : (
          <>
            <TopBar
              tab={tab}
              requestCount={requests.incoming.length}
              onOpenMenu={() => setModal("contacts-menu")}
              locale={locale}
              onToggleLocale={() => setLocale((previous) => (previous === "zh" ? "en" : "zh"))}
            />

            <div className="relative flex-1 overflow-y-auto px-3 pb-20">
              {status && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-600 shadow-soft">
                  {status}
                </div>
              )}

              {tab === "chats" && (
                <ChatsTab
                  t={t}
                  sitePublic={sitePublic}
                  chatsNotesHidden={chatsNotesHidden}
                  setChatsNotesHidden={setChatsNotesHidden}
                  chatSearchQuery={chatSearchQuery}
                  setChatSearchQuery={setChatSearchQuery}
                  filteredConversations={filteredConversations}
                  openConversation={(conversation) => void openConversation(conversation)}
                  cn={cn}
                />
              )}

              {tab === "contacts" && (
                <ContactsTab
                  locale={locale}
                  t={t}
                  contactsView={contactsView}
                  setContactsView={setContactsView}
                  contactsSearchQuery={contactsSearchQuery}
                  setContactsSearchQuery={setContactsSearchQuery}
                  contactsGroupExpanded={contactsGroupExpanded}
                  setContactsGroupExpanded={setContactsGroupExpanded}
                  contactsFriendExpanded={contactsFriendExpanded}
                  setContactsFriendExpanded={setContactsFriendExpanded}
                  filteredGroupConversations={filteredGroupConversations}
                  filteredFriends={filteredFriends}
                  openConversation={(conversation) => void openConversation(conversation)}
                  startDm={(peerId) => void startDm(peerId)}
                  unreadNotifications={unreadNotifications}
                  notifications={notifications}
                  notificationsCursor={notificationsCursor}
                  notificationsLoading={notificationsLoading}
                  loadNotifications={(options) => void loadNotifications(options)}
                  markAllNotificationsRead={() => void markAllNotificationsRead()}
                  flashStatus={flashStatus}
                  formatTime={formatTime}
                />
              )}

              {tab === "discover" && (
                <DiscoverTab
                  locale={locale}
                  t={t}
                  sitePublic={sitePublic}
                  discoverView={discoverView}
                  setDiscoverView={setDiscoverView}
                  todayMomentsCount={todayMomentsCount}
                  discoverHotLoading={discoverHotLoading}
                  discoverHot={discoverHot}
                  isDiscoverHotBoardVisible={isDiscoverHotBoardVisible}
                  openHotGroupFromDiscover={(groupId) => void openHotGroupFromDiscover(groupId)}
                  momentsLoading={momentsLoading}
                  moments={moments}
                  momentDraft={momentDraft}
                  setMomentDraft={setMomentDraft}
                  momentNotice={momentNotice}
                  setMomentNotice={setMomentNotice}
                  momentFiles={momentFiles}
                  setMomentFiles={setMomentFiles}
                  enqueueMomentUploads={enqueueMomentUploads}
                  publishMoment={() => void publishMoment()}
                  busy={busy ?? ""}
                  formatTime={formatTime}
                  buildAssetUrl={buildAssetUrl}
                  reportMoment={(momentId) => void reportMoment(momentId)}
                  toggleMomentLike={(momentId) => void toggleMomentLike(momentId)}
                  expandedMomentComments={expandedMomentComments}
                  setExpandedMomentComments={setExpandedMomentComments}
                  momentComments={momentComments}
                  momentCommentsLoading={momentCommentsLoading}
                  loadMomentComments={(momentId) => void loadMomentComments(momentId)}
                  countMomentComments={countMomentComments}
                  momentReplyTargets={momentReplyTargets}
                  setMomentReplyTargets={setMomentReplyTargets}
                  momentCommentDrafts={momentCommentDrafts}
                  setMomentCommentDrafts={setMomentCommentDrafts}
                  submitMomentComment={(momentId) => void submitMomentComment(momentId)}
                  deleteMomentComment={(momentId, commentId) => void deleteMomentComment(momentId, commentId)}
                  toggleMomentCommentLike={(momentId, commentId) => void toggleMomentCommentLike(momentId, commentId)}
                  toggleMomentCommentPin={(momentId, commentId) => void toggleMomentCommentPin(momentId, commentId)}
                  onAddAuthorAsFriend={(authorId) => {
                    setTab("contacts");
                    setModal("add-friend");
                    setFriendTarget(String(authorId));
                  }}
                  cn={cn}
                />
              )}

              {tab === "me" && (
                <MeTab
                  locale={locale}
                  t={t}
                  meSubView={meSubView}
                  setMeSubView={setMeSubView}
                  socketConnected={socketConnected}
                  session={session}
                  points={points}
                  tasks={tasks}
                  busy={busy ?? ""}
                  loadPointsAndTasks={() => void loadPointsAndTasks()}
                  onClaimTask={(taskKey) =>
                    api
                      .post(`/tasks/${taskKey}/claim`, {})
                      .then(() => loadPointsAndTasks())
                      .catch((error) => setStatus(mapApiError(error, t("领奖失败", "Claim failed"))))
                  }
                  formatTime={formatTime}
                  shortAddress={shortAddress}
                  flashStatus={flashStatus}
                  didResolveStatus={didResolveStatus}
                  profileExplorerUrl={profileExplorerUrl}
                  walletsExpanded={walletsExpanded}
                  setWalletsExpanded={setWalletsExpanded}
                  setModal={setModal}
                  logout={() => void logout()}
                  cn={cn}
                  onSetStatus={setStatus}
                />
              )}
            </div>

            <BottomTabNav
              tab={tab}
              t={t}
              conversations={conversations}
              incomingRequestCount={requests.incoming.length}
              unreadNotifications={unreadNotifications}
              onChangeTab={setTab}
              onOpenDiscover={() => {
                setTab("discover");
                setDiscoverView("menu");
              }}
              onOpenMe={() => {
                setTab("me");
                setMeSubView("main");
              }}
            />
          </>
        )}

        <Overlay open={modal !== null} onClose={() => setModal(null)}>
          <AppModals
            modal={modal}
            setModal={setModal}
            t={t}
            requests={requests}
            busy={busy}
            setBusy={setBusy}
            sitePublic={sitePublic}
            friendTarget={friendTarget}
            setFriendTarget={setFriendTarget}
            groupName={groupName}
            setGroupName={setGroupName}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            submitFriendRequest={() => submitFriendRequest()}
            createGroup={() => createGroup()}
            joinGroup={() => joinGroup()}
            answerRequest={(requestId, action) => answerRequest(requestId, action)}
            shortAddress={shortAddress}
            flashStatus={flashStatus}
            bindChainType={bindChainType}
            setBindChainType={setBindChainType}
            handleSiweLogin={handleSiweLogin}
            profileAvatarUrlManual={profileAvatarUrlManual}
            setProfileAvatarUrlManual={setProfileAvatarUrlManual}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            buildAssetUrl={buildAssetUrl}
            uploadAvatar={uploadAvatar}
            saveProfile={() => saveProfile()}
            setStatus={setStatus}
            feedbackDraft={feedbackDraft}
            setFeedbackDraft={setFeedbackDraft}
            submitFeedback={() => submitFeedback()}
            cn={cn}
            session={session}
          />
        </Overlay>
      </section>
    </main>
  );
}

function ChatRoom(props: {
  conversation: ConversationSummary;
  messages: MessageView[];
  locale: "zh" | "en";
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
  onDecisionAction?: (action: DecisionAction) => void;
  decisionContext?: DecisionContext;
}) {
  const t = (zh: string, en: string) => (props.locale === "en" ? en : zh);
  const isConciergeDm =
    props.conversation.kind === "dm" && /concierge/i.test(props.conversation.title);
  const canSend = props.draft.trim().length > 0 && !props.busy;
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [autoScrollLocked, setAutoScrollLocked] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [pendingNewMessageCount, setPendingNewMessageCount] = useState(0);
  const lastSeenMessageIdRef = useRef<number | null>(null);
  const [memberActionTarget, setMemberActionTarget] = useState<GroupMember | null>(null);
  const [memberProfileOpen, setMemberProfileOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [decisionCollapsed, setDecisionCollapsed] = useState(false);
  const [activeDecisionSectionId, setActiveDecisionSectionId] = useState<string | null>(null);
  const [activeDecisionQuestionId, setActiveDecisionQuestionId] = useState<string | null>(null);
  const [recentDecisionPath, setRecentDecisionPath] = useState<RecentDecisionPath | null>(null);
  const skipDraftCollapseRef = useRef(false);
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

  function formatMessageTime(value: string | null | undefined) {
    if (!value) return t("刚刚", "Now");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("刚刚", "Now");
    return date.toLocaleTimeString(props.locale === "en" ? "en-US" : "zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatRelativeTime(value: string) {
    const ms = new Date(value).getTime();
    if (!ms || Number.isNaN(ms)) return "";
    const diff = Date.now() - ms;
    if (diff < 60 * 1000) return t("刚刚", "just now");
    if (diff < 60 * 60 * 1000) return t(`${Math.floor(diff / (60 * 1000))} 分钟前`, `${Math.floor(diff / (60 * 1000))}m ago`);
    if (diff < 24 * 60 * 60 * 1000) return t(`${Math.floor(diff / (60 * 60 * 1000))} 小时前`, `${Math.floor(diff / (60 * 60 * 1000))}h ago`);
    return t(`${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`, `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`);
  }

  function scrollToLatestMessage() {
    if (autoScrollLocked) return;
    messageEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  function jumpToBottom() {
    setAutoScrollLocked(false);
    setShowJumpToBottom(false);
    setPendingNewMessageCount(0);
    messageEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  function sendQuickReply(text: string) {
    if (props.busy) return;
    skipDraftCollapseRef.current = true;
    props.setDraft(text);
    window.setTimeout(() => {
      props.onSend();
    }, 0);
  }
  function trackDecisionEvent(
    eventName: string,
    payload: Record<string, string | number | boolean | null | undefined>
  ) {
    if (typeof window === "undefined") return;
    const bucket = "__cxDecisionEvents";
    const event = {
      eventName,
      ...payload,
      timestamp: new Date().toISOString()
    };
    const previous = (window as Window & { __cxDecisionEvents?: typeof event[] })[bucket] ?? [];
    (window as Window & { __cxDecisionEvents?: typeof event[] })[bucket] = [...previous.slice(-99), event];
  }

  function runDecisionAction(action: DecisionAction) {
    trackDecisionEvent("decision_action_click", {
      action,
      sectionId: activeDecisionSectionId,
      questionId: activeDecisionQuestionId
    });
    if (!props.onDecisionAction) {
      sendQuickReply(
        t("当前动作暂不可用，请先从底部导航进入对应页面。", "This action is unavailable now, please use bottom navigation.")
      );
      trackDecisionEvent("decision_action_fallback", { action });
      return;
    }
    const currentQuestion = conciergeSections
      .find((section) => section.id === activeDecisionSectionId)
      ?.questions.find((question) => question.id === activeDecisionQuestionId);
    if (activeDecisionSectionId && activeDecisionQuestionId && currentQuestion) {
      const path: RecentDecisionPath = {
        sectionId: activeDecisionSectionId,
        questionId: activeDecisionQuestionId,
        action,
        questionLabel: currentQuestion.ask,
        updatedAt: new Date().toISOString()
      };
      setRecentDecisionPath(path);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cx_recent_decision_path", JSON.stringify(path));
      }
    }
    props.onDecisionAction(action);
    trackDecisionEvent("decision_action_navigate", {
      action,
      sectionId: activeDecisionSectionId,
      questionId: activeDecisionQuestionId
    });
  }

  const conciergeSections = useMemo(() => {
    const ordered = [...CONCIERGE_DECISION_TREE].sort(
      (a, b) => a.priority(props.decisionContext) - b.priority(props.decisionContext)
    );
    return ordered.map((section) => ({
      id: section.id,
      title: props.locale === "en" ? section.titleEn : section.titleZh,
      questions: section.questions.map((question) => ({
        ...question,
        ask: props.locale === "en" ? question.askEn : question.askZh,
        learn: props.locale === "en" ? question.learnEn : question.learnZh,
        actionLabel: props.locale === "en" ? question.actionLabelEn : question.actionLabelZh
      }))
    }));
  }, [props.decisionContext, props.locale]);

  useEffect(() => {
    const lastMessage = props.messages[props.messages.length - 1];
    const lastMessageId = lastMessage?.id ?? null;
    const isNewMessage = lastMessageId !== null && lastSeenMessageIdRef.current !== lastMessageId;
    if (isNewMessage && lastMessage?.mine) {
      // Always follow messages sent by myself.
      jumpToBottom();
    } else if (isNewMessage && autoScrollLocked) {
      setShowJumpToBottom(true);
      setPendingNewMessageCount((previous) => previous + 1);
    }
    lastSeenMessageIdRef.current = lastMessageId;
    scrollToLatestMessage();
  }, [props.messages.length]);

  useEffect(() => {
    const node = messageScrollRef.current;
    if (!node) return;
    const onScroll = () => {
      // When user scrolls far from bottom, pause auto-follow.
      const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      const locked = distanceToBottom > 80;
      setAutoScrollLocked(locked);
      if (!locked) {
        setShowJumpToBottom(false);
        setPendingNewMessageCount(0);
      }
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isConciergeDm) return;
    if (!conciergeSections.length) return;
    setActiveDecisionSectionId((previous) => previous ?? conciergeSections[0].id);
  }, [conciergeSections, isConciergeDm]);

  useEffect(() => {
    if (!isConciergeDm) return;
    if (!props.draft.trim()) return;
    if (skipDraftCollapseRef.current) {
      skipDraftCollapseRef.current = false;
      return;
    }
    setDecisionCollapsed(true);
  }, [props.draft, isConciergeDm]);

  useEffect(() => {
    if (!isConciergeDm) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("cx_recent_decision_path");
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentDecisionPath;
      const updatedAtMs = parsed?.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
      const isExpired = !updatedAtMs || Date.now() - updatedAtMs > 7 * 24 * 60 * 60 * 1000;
      if (isExpired) {
        window.localStorage.removeItem("cx_recent_decision_path");
        return;
      }
      if (parsed?.sectionId && parsed?.questionId && parsed?.action) {
        setRecentDecisionPath(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, [isConciergeDm]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const syncInset = () => {
      const rawInset = window.innerHeight - vv.height - vv.offsetTop;
      const nextInset = Math.max(0, Math.min(420, Math.round(rawInset)));
      setKeyboardInset(nextInset);
    };
    syncInset();
    vv.addEventListener("resize", syncInset);
    vv.addEventListener("scroll", syncInset);
    window.addEventListener("orientationchange", syncInset);
    return () => {
      vv.removeEventListener("resize", syncInset);
      vv.removeEventListener("scroll", syncInset);
      window.removeEventListener("orientationchange", syncInset);
    };
  }, []);

  useEffect(() => {
    if (keyboardInset <= 0) return;
    messageEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [keyboardInset]);

  return (
    <div className="relative z-10 flex h-full flex-col">
      <ChatRoomHeader
        t={t}
        conversation={props.conversation}
        isConciergeDm={isConciergeDm}
        onBack={props.onBack}
        groupManageOpen={props.groupManageOpen}
        setGroupManageOpen={props.setGroupManageOpen}
      />

      <div
        ref={messageScrollRef}
        className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fbfc_0%,#f3f7fa_45%,#f1f5f8_100%)] px-3 py-2"
      >
        <div className="space-y-2.5">
          <ChatDecisionPanel
            visible={isConciergeDm}
            t={t}
            decisionCollapsed={decisionCollapsed}
            onToggleCollapsed={() => {
              setDecisionCollapsed((previous) => !previous);
              trackDecisionEvent("decision_toggle", {
                collapsed: !decisionCollapsed
              });
            }}
            recentDecisionPath={recentDecisionPath}
            onClearRecentPath={() => {
              setRecentDecisionPath(null);
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("cx_recent_decision_path");
              }
              trackDecisionEvent("decision_recent_path_clear", {});
            }}
            formatRelativeTime={formatRelativeTime}
            onContinueRecentPath={() => {
              if (!recentDecisionPath) return;
              runDecisionAction(recentDecisionPath.action);
            }}
            onReviewRecentPath={() => {
              if (!recentDecisionPath) return;
              setActiveDecisionSectionId(recentDecisionPath.sectionId);
              setActiveDecisionQuestionId(recentDecisionPath.questionId);
            }}
            conciergeSections={conciergeSections}
            activeDecisionSectionId={activeDecisionSectionId}
            setActiveDecisionSectionId={setActiveDecisionSectionId}
            setActiveDecisionQuestionId={setActiveDecisionQuestionId}
            onDecisionSectionSelect={(sectionId) => {
              trackDecisionEvent("decision_section_select", { sectionId });
            }}
            activeDecisionQuestionId={activeDecisionQuestionId}
            onDecisionQuestionOpen={(questionId) => {
              setActiveDecisionQuestionId(questionId);
              trackDecisionEvent("decision_question_open", {
                sectionId: activeDecisionSectionId,
                questionId
              });
            }}
            onDecisionAction={runDecisionAction}
            sendQuickReply={sendQuickReply}
          />
          <ChatMessageList
            t={t}
            conversationKind={props.conversation.kind}
            messages={props.messages}
            members={props.members}
            isConciergeDm={isConciergeDm}
            formatMessageTime={formatMessageTime}
            sendQuickReply={sendQuickReply}
            onOpenMemberActions={(member) => {
              setMemberActionTarget(member);
              setMemberProfileOpen(false);
            }}
            messageEndRef={messageEndRef}
          />
        </div>
      </div>
      <ChatOverlays
        t={t}
        showJumpToBottom={showJumpToBottom}
        pendingNewMessageCount={pendingNewMessageCount}
        onJumpToBottom={jumpToBottom}
        mentions={props.mentions}
        members={props.members}
      />

      <div
        style={{
          paddingBottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined
        }}
        className="transition-[padding-bottom] duration-200 ease-out"
      >
        <ChatComposer
          t={t}
          conversationKind={props.conversation.kind}
          encryptionEnabled={props.encryptionEnabled}
          encryptionFallback={props.encryptionFallback}
          isConciergeDm={isConciergeDm}
          draft={props.draft}
          setDraft={props.setDraft}
          onSend={props.onSend}
          busy={props.busy}
          canSend={canSend}
          emojiOpen={emojiOpen}
          setEmojiOpen={setEmojiOpen}
          autoScrollLocked={autoScrollLocked}
          scrollToLatestMessage={scrollToLatestMessage}
          mentionCandidates={mentionCandidates}
          insertMention={insertMention}
          shortAddress={shortAddress}
          emojiList={emojiList}
        />
      </div>

      <ChatGroupPanels
        open={props.groupManageOpen}
        conversation={props.conversation}
        members={props.members}
        role={props.role}
        onCloseGroupManage={() => props.setGroupManageOpen(false)}
        onMute={props.onMute}
        onKick={props.onKick}
        onCopyInviteCode={props.onCopyInviteCode}
        onLeaveGroup={props.onLeaveGroup}
        mentions={props.mentions}
        setMentions={props.setMentions}
        draft={props.draft}
        setDraft={props.setDraft}
        memberActionTarget={memberActionTarget}
        setMemberActionTarget={setMemberActionTarget}
        memberProfileOpen={memberProfileOpen}
        setMemberProfileOpen={setMemberProfileOpen}
      />
    </div>
  );
}

