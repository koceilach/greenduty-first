"use client";

import { useChat } from "@/lib/messages/useChat";
import { MessageBubble } from "./MessageBubble";
import { VoiceRecorder } from "./VoiceRecorder";
import {
  ArrowLeft,
  BellOff,
  Camera,
  ChevronDown,
  Flag,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Pin,
  Phone,
  Send,
  ShieldBan,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Message } from "@/lib/messages/types";

type PresenceStatus = "online" | "offline" | "away";
type ChatTheme = "ocean" | "light" | "forest";

type ChatRoomProps = {
  conversationId: string;
  otherUser?: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    online: boolean;
    status: PresenceStatus;
    lastSeenAt: string | null;
  };
};

const THEME_KEY = "gd-chat-theme";
const DRAFT_KEY_PREFIX = "gd-chat-draft:";
const MUTED_OVERRIDES_PREFIX = "gd-chat-muted-overrides:";
const PINNED_MESSAGE_KEY_PREFIX = "gd-chat-pinned-message:";
const CHAT_THEMES: ChatTheme[] = ["ocean", "light", "forest"];
const touch = "active:scale-[0.97] transition-transform duration-200";

const themeStyles: Record<
  ChatTheme,
  {
    root: string;
    header: string;
    iconBtn: string;
    dateChip: string;
    loadBtn: string;
    inputBar: string;
    inputShell: string;
    inputText: string;
    menu: string;
    menuItem: string;
    notice: string;
    subtle: string;
  }
> = {
  ocean: {
    root: "bg-[#020B2F] text-slate-100",
    header: "border-slate-700 bg-[#121A35]",
    iconBtn: "text-slate-300 hover:bg-slate-700/50",
    dateChip: "bg-slate-700/70 text-slate-300",
    loadBtn: "bg-slate-800 text-slate-300 hover:bg-slate-700",
    inputBar: "border-slate-700 bg-[#121A35]",
    inputShell: "border-slate-700 bg-slate-900/50",
    inputText: "text-slate-100 placeholder:text-slate-400",
    menu: "border-slate-700 bg-[#121A35] text-slate-100",
    menuItem: "hover:bg-slate-700/50",
    notice: "bg-slate-800/80 text-slate-200",
    subtle: "text-slate-300",
  },
  light: {
    root: "bg-[#F6F8F7] text-slate-900",
    header: "border-slate-200 bg-white",
    iconBtn: "text-slate-500 hover:bg-slate-100",
    dateChip: "bg-slate-200/80 text-slate-500",
    loadBtn: "bg-slate-200 text-slate-500 hover:bg-slate-300",
    inputBar: "border-slate-200 bg-white",
    inputShell: "border-slate-200 bg-slate-50",
    inputText: "text-slate-900 placeholder:text-slate-400",
    menu: "border-slate-200 bg-white text-slate-800",
    menuItem: "hover:bg-slate-100",
    notice: "bg-slate-100 text-slate-700",
    subtle: "text-slate-500",
  },
  forest: {
    root: "bg-[#071F1A] text-emerald-50",
    header: "border-emerald-900/50 bg-[#0D2B25]",
    iconBtn: "text-emerald-100 hover:bg-emerald-900/40",
    dateChip: "bg-emerald-900/60 text-emerald-100",
    loadBtn: "bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800/70",
    inputBar: "border-emerald-900/50 bg-[#0D2B25]",
    inputShell: "border-emerald-900/60 bg-emerald-950/40",
    inputText: "text-emerald-50 placeholder:text-emerald-200/70",
    menu: "border-emerald-900/60 bg-[#123A32] text-emerald-50",
    menuItem: "hover:bg-emerald-900/40",
    notice: "bg-emerald-900/60 text-emerald-50",
    subtle: "text-emerald-200/90",
  },
};

const themeLabel: Record<ChatTheme, string> = {
  ocean: "Ocean",
  light: "Light",
  forest: "Forest",
};

const shortAgo = (iso: string | null, now: number) => {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
};

const presenceCopy = (
  status: PresenceStatus | undefined,
  lastSeenAt: string | null | undefined,
  now: number
) => {
  const ago = shortAgo(lastSeenAt ?? null, now);
  if (status === "online") {
    return ago ? `Online - active ${ago} ago` : "Online";
  }
  if (status === "away") {
    return ago ? `Away - seen ${ago} ago` : "Away";
  }
  return ago ? `Offline - last seen ${ago} ago` : "Offline";
};

export function ChatRoom({ conversationId, otherUser }: ChatRoomProps) {
  const {
    messages,
    loading,
    sending,
    hasMore,
    currentUserId,
    otherParticipantLastReadAt,
    sendMessage,
    editMessage,
    loadMore,
    markAsRead,
  } = useChat(conversationId);

  const [text, setText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatTheme, setChatTheme] = useState<ChatTheme>("light");
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [conversationMuted, setConversationMuted] = useState(false);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"block" | "report" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState<number>(Date.now());
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const outgoingTypingTimerRef = useRef<number | null>(null);
  const incomingTypingTimerRef = useRef<number | null>(null);
  const lastTypingEmitRef = useRef(0);
  const effectiveTheme: ChatTheme = isMobileLayout ? "light" : chatTheme;
  const styles = themeStyles[effectiveTheme];

  const displayName = otherUser?.fullName?.trim() || otherUser?.username?.trim() || "Chat";
  const usernameLine = otherUser?.username ? `@${otherUser.username}` : "No username";
  const avatarText = displayName.slice(0, 2).toUpperCase();
  const chatLockedReason = blockedByMe
    ? "You blocked this user. Unblock them to send messages."
    : blockedByThem
    ? "This user blocked you. Messaging is unavailable."
    : null;
  const statusLine = useMemo(
    () => presenceCopy(otherUser?.status, otherUser?.lastSeenAt, clockTick),
    [otherUser?.status, otherUser?.lastSeenAt, clockTick]
  );
  const compactStatus =
    otherUser?.status === "online"
      ? "Online"
      : otherUser?.status === "away"
      ? "Away"
      : "Offline";
  const mobileStatus = otherUserTyping ? "Typing..." : compactStatus;
  const desktopStatus = otherUserTyping ? `${usernameLine} - typing...` : `${usernameLine} - ${statusLine}`;

  const readMutedOverrides = useCallback((userId: string): Map<string, boolean> => {
    try {
      const raw = window.localStorage.getItem(`${MUTED_OVERRIDES_PREFIX}${userId}`);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (!parsed || typeof parsed !== "object") return new Map();
      return new Map(
        Object.entries(parsed).filter(
          (entry): entry is [string, boolean] =>
            typeof entry[0] === "string" && typeof entry[1] === "boolean"
        )
      );
    } catch {
      return new Map();
    }
  }, []);

  const writeMutedOverrides = useCallback((userId: string, map: Map<string, boolean>) => {
    try {
      if (!map.size) {
        window.localStorage.removeItem(`${MUTED_OVERRIDES_PREFIX}${userId}`);
        return;
      }
      window.localStorage.setItem(
        `${MUTED_OVERRIDES_PREFIX}${userId}`,
        JSON.stringify(Object.fromEntries(map.entries()))
      );
    } catch {
      // no-op
    }
  }, []);

  const readPinnedMessageLocal = useCallback((userId: string, convId: string): string | null => {
    try {
      const value = window.localStorage.getItem(`${PINNED_MESSAGE_KEY_PREFIX}${userId}:${convId}`);
      return value && value.trim().length ? value : null;
    } catch {
      return null;
    }
  }, []);

  const writePinnedMessageLocal = useCallback(
    (userId: string, convId: string, messageId: string | null) => {
      try {
        const key = `${PINNED_MESSAGE_KEY_PREFIX}${userId}:${convId}`;
        if (!messageId) {
          window.localStorage.removeItem(key);
          return;
        }
        window.localStorage.setItem(key, messageId);
      } catch {
        // no-op
      }
    },
    []
  );

  const bindMessageNode = useCallback((messageId: string, node: HTMLDivElement | null) => {
    const map = messageNodeMapRef.current;
    if (node) {
      map.set(messageId, node);
    } else {
      map.delete(messageId);
    }
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme && CHAT_THEMES.includes(savedTheme as ChatTheme)) {
      setChatTheme(savedTheme as ChatTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, chatTheme);
  }, [chatTheme]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileLayout(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    return () => {
      if (outgoingTypingTimerRef.current) {
        window.clearTimeout(outgoingTypingTimerRef.current);
        outgoingTypingTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const draftKey = `${DRAFT_KEY_PREFIX}${conversationId}`;
    const savedDraft = window.localStorage.getItem(draftKey);
    setText(savedDraft ?? "");
    setShowVoice(false);
  }, [conversationId]);

  useEffect(() => {
    const draftKey = `${DRAFT_KEY_PREFIX}${conversationId}`;
    if (text.trim()) {
      window.localStorage.setItem(draftKey, text);
    } else {
      window.localStorage.removeItem(draftKey);
    }
  }, [conversationId, text]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const refreshBlockState = useCallback(async () => {
    if (!currentUserId || !otherUser?.id) {
      setBlockedByMe(false);
      setBlockedByThem(false);
      return;
    }

    const [mine, theirs] = await Promise.all([
      supabase
        .from("chat_user_blocks")
        .select("blocker_id", { count: "exact", head: true })
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", otherUser.id),
      supabase
        .from("chat_user_blocks")
        .select("blocker_id", { count: "exact", head: true })
        .eq("blocker_id", otherUser.id)
        .eq("blocked_id", currentUserId),
    ]);

    if (mine.error || theirs.error) {
      setBlockedByMe(false);
      setBlockedByThem(false);
      return;
    }

    setBlockedByMe((mine.count ?? 0) > 0);
    setBlockedByThem((theirs.count ?? 0) > 0);
  }, [currentUserId, otherUser?.id]);

  useEffect(() => {
    void refreshBlockState();
  }, [refreshBlockState]);

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setConversationMuted(false);
      return;
    }

    let cancelled = false;
    const loadMutedState = async () => {
      const overrides = readMutedOverrides(currentUserId);
      const override = overrides.get(conversationId);
      if (typeof override === "boolean") {
        if (!cancelled) setConversationMuted(override);
        return;
      }

      const { data, error } = await supabase
        .from("conversation_participants")
        .select("is_muted")
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setConversationMuted(false);
        return;
      }
      setConversationMuted(Boolean(data?.is_muted));
    };

    void loadMutedState();
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId, readMutedOverrides]);

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setPinnedMessageId(null);
      return;
    }

    let cancelled = false;
    const localPinned = readPinnedMessageLocal(currentUserId, conversationId);
    setPinnedMessageId(localPinned);

    const loadPinnedState = async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("pinned_message_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        // Column may not exist yet; keep local fallback.
        return;
      }

      const dbPinned = data?.pinned_message_id ?? null;
      setPinnedMessageId(dbPinned);
      writePinnedMessageLocal(currentUserId, conversationId, dbPinned);
    };

    void loadPinnedState();
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId, readPinnedMessageLocal, writePinnedMessageLocal]);

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!typingChannelRef.current || !currentUserId || !otherUser?.id) return;
      void typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          targetUserId: otherUser.id,
          typing,
          at: Date.now(),
        },
      });
    },
    [currentUserId, otherUser?.id]
  );

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`chat-typing-${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as {
          userId?: string;
          targetUserId?: string;
          typing?: boolean;
        };

        if (!data?.userId || data.userId === currentUserId) return;
        if (otherUser?.id && data.userId !== otherUser.id) return;
        if (data.targetUserId && data.targetUserId !== currentUserId) return;

        if (data.typing) {
          setOtherUserTyping(true);
          if (incomingTypingTimerRef.current) {
            window.clearTimeout(incomingTypingTimerRef.current);
          }
          incomingTypingTimerRef.current = window.setTimeout(() => {
            setOtherUserTyping(false);
            incomingTypingTimerRef.current = null;
          }, 2400);
        } else {
          setOtherUserTyping(false);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (incomingTypingTimerRef.current) {
        window.clearTimeout(incomingTypingTimerRef.current);
        incomingTypingTimerRef.current = null;
      }
      setOtherUserTyping(false);
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [conversationId, currentUserId, otherUser?.id]);

  /* scroll to bottom on new messages */
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  /* mark as read on mount */
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  useEffect(() => {
    if (!messages.length) return;
    markAsRead();
  }, [markAsRead, messages]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsAtBottom(atBottom);
    if (atBottom) {
      void markAsRead();
    }

    if (el.scrollTop < 100 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loadMore, loading, markAsRead]);

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || chatLockedReason) return;
    setText("");
    await sendMessage({ content: trimmed, messageType: "text" });
    emitTyping(false);
  };

  const handleTextChange = useCallback(
    (nextText: string) => {
      setText(nextText);
      if (chatLockedReason || !currentUserId || !otherUser?.id) return;

      const now = Date.now();
      const hasText = nextText.trim().length > 0;

      if (!hasText) {
        emitTyping(false);
        if (outgoingTypingTimerRef.current) {
          window.clearTimeout(outgoingTypingTimerRef.current);
          outgoingTypingTimerRef.current = null;
        }
        return;
      }

      if (now - lastTypingEmitRef.current > 1200) {
        lastTypingEmitRef.current = now;
        emitTyping(true);
      }

      if (outgoingTypingTimerRef.current) {
        window.clearTimeout(outgoingTypingTimerRef.current);
      }
      outgoingTypingTimerRef.current = window.setTimeout(() => {
        emitTyping(false);
        outgoingTypingTimerRef.current = null;
      }, 1500);
    },
    [chatLockedReason, currentUserId, emitTyping, otherUser?.id]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, nextContent: string) => {
      const ok = await editMessage(messageId, nextContent);
      if (!ok) {
        setNotice("Unable to edit this message.");
      }
      return ok;
    },
    [editMessage]
  );

  const handleReportMessage = useCallback(
    async (message: Message) => {
      if (!currentUserId) {
        setNotice("Sign in again to report this message.");
        return;
      }

      if (message.senderId === currentUserId) {
        setNotice("You cannot report your own message.");
        return;
      }

      const reason = window.prompt("Report reason (spam, abuse, etc.)", "abuse");
      if (reason === null) return;
      const details = window.prompt("Additional details (optional)", "");

      const { error } = await supabase.from("chat_user_reports").insert({
        reporter_id: currentUserId,
        reported_user_id: message.senderId,
        conversation_id: conversationId,
        message_id: message.id,
        reason: reason.trim() || "unspecified",
        details: details?.trim() || null,
      });

      if (error) {
        setNotice(
          error.message.includes("chat_user_reports")
            ? "Report feature is not enabled yet. Run the latest chat migration."
            : `Message report failed: ${error.message}`
        );
        return;
      }

      setNotice("Message report submitted.");
    },
    [conversationId, currentUserId]
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendText();
    }
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (chatLockedReason) return;
    emitTyping(false);

    const fileName = `voice/${conversationId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(fileName, blob, { contentType: "audio/webm" });

    if (uploadError) {
      setNotice(`Voice upload failed: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(fileName);
    await sendMessage({
      messageType: "voice",
      mediaUrl: urlData.publicUrl,
      mediaDuration: duration,
    });
    setShowVoice(false);
  };

  const handleSendImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (chatLockedReason) return;
    emitTyping(false);

    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = `images/${conversationId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      setNotice(`Image upload failed: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(fileName);
    await sendMessage({
      messageType: "image",
      mediaUrl: urlData.publicUrl,
    });

    event.target.value = "";
  };

  const handleCall = () => {
    setNotice("Voice call is coming soon.");
  };

  const handleVideoCall = () => {
    setNotice("Video call is coming soon.");
  };

  const handleToggleBlock = async () => {
    if (!currentUserId || !otherUser?.id || busyAction) return;
    setBusyAction("block");

    const action = blockedByMe
      ? supabase
          .from("chat_user_blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", otherUser.id)
      : supabase
          .from("chat_user_blocks")
          .insert({ blocker_id: currentUserId, blocked_id: otherUser.id });

    const { error } = await action;
    setBusyAction(null);
    setMenuOpen(false);

    if (error) {
      setNotice(
        error.message.includes("chat_user_blocks")
          ? "Block feature is not enabled yet. Run the latest chat migration."
          : `Block action failed: ${error.message}`
      );
      return;
    }

    setBlockedByMe((prev) => !prev);
    setNotice(blockedByMe ? "User unblocked." : "User blocked.");
  };

  const handleReportUser = async () => {
    if (!currentUserId || !otherUser?.id || busyAction) return;

    const reason = window.prompt("Report reason (spam, abuse, etc.)", "abuse");
    if (reason === null) return;
    const details = window.prompt("Additional details (optional)", "");

    setBusyAction("report");
    const { error } = await supabase.from("chat_user_reports").insert({
      reporter_id: currentUserId,
      reported_user_id: otherUser.id,
      conversation_id: conversationId,
      reason: reason.trim() || "unspecified",
      details: details?.trim() || null,
    });
    setBusyAction(null);
    setMenuOpen(false);

    if (error) {
      setNotice(
        error.message.includes("chat_user_reports")
          ? "Report feature is not enabled yet. Run the latest chat migration."
          : `Report failed: ${error.message}`
      );
      return;
    }

    setNotice("User report submitted.");
  };

  const handleToggleConversationMute = async () => {
    if (!currentUserId || !conversationId) return;
    const nextMuted = !conversationMuted;
    setConversationMuted(nextMuted);

    const overrides = readMutedOverrides(currentUserId);
    overrides.set(conversationId, nextMuted);
    writeMutedOverrides(currentUserId, overrides);

    const { error } = await supabase
      .from("conversation_participants")
      .update({ is_muted: nextMuted })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    if (error) {
      setNotice(nextMuted ? "Conversation muted (local)." : "Conversation unmuted (local).");
      return;
    }

    const synced = readMutedOverrides(currentUserId);
    synced.delete(conversationId);
    writeMutedOverrides(currentUserId, synced);
    setNotice(nextMuted ? "Conversation muted." : "Conversation unmuted.");
  };

  const persistPinnedMessage = useCallback(
    async (nextMessageId: string | null) => {
      if (!conversationId || !currentUserId) return false;

      setPinnedMessageId(nextMessageId);
      writePinnedMessageLocal(currentUserId, conversationId, nextMessageId);

      const { error } = await supabase
        .from("conversation_participants")
        .update({ pinned_message_id: nextMessageId })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);

      if (error) {
        setNotice(nextMessageId ? "Message pinned (local)." : "Message unpinned (local).");
        return false;
      }

      return true;
    },
    [conversationId, currentUserId, writePinnedMessageLocal]
  );

  const handleToggleMessagePin = useCallback(
    async (message: Message) => {
      const nextMessageId = pinnedMessageId === message.id ? null : message.id;
      const synced = await persistPinnedMessage(nextMessageId);
      if (synced) {
        setNotice(nextMessageId ? "Message pinned." : "Message unpinned.");
      }
    },
    [persistPinnedMessage, pinnedMessageId]
  );

  const jumpToPinnedMessage = useCallback(async () => {
    if (!pinnedMessageId) return;

    const node = messageNodeMapRef.current.get(pinnedMessageId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(pinnedMessageId);
      window.setTimeout(() => {
        setHighlightedMessageId((prev) => (prev === pinnedMessageId ? null : prev));
      }, 1600);
      void markAsRead();
      return;
    }

    if (hasMore && !loading) {
      loadMore();
      setNotice("Loading older messages to find pinned one...");
      return;
    }

    setNotice("Pinned message is not currently loaded.");
  }, [hasMore, loadMore, loading, markAsRead, pinnedMessageId]);

  const groupedMessages = messages.reduce<{ date: string; msgs: typeof messages }[]>((acc, msg) => {
    const createdAt = new Date(msg.createdAt);
    const today = new Date();
    const isToday = createdAt.toDateString() === today.toDateString();
    const dateLabel = isToday
      ? `Today, ${createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : createdAt.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
    const last = acc[acc.length - 1];
    if (last?.date === dateLabel) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateLabel, msgs: [msg] });
    }
    return acc;
  }, []);
  const lastOwnMessageId = useMemo(() => {
    if (!currentUserId) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].senderId === currentUserId) return messages[i].id;
    }
    return null;
  }, [currentUserId, messages]);
  const pinnedMessage = useMemo(
    () => (pinnedMessageId ? messages.find((message) => message.id === pinnedMessageId) ?? null : null),
    [messages, pinnedMessageId]
  );
  const pinnedPreview = useMemo(() => {
    if (!pinnedMessageId) return "";
    if (!pinnedMessage) return "Pinned message is older. Tap to load and jump.";

    if (pinnedMessage.messageType === "image") return "Photo";
    if (pinnedMessage.messageType === "voice") return "Voice message";
    if (pinnedMessage.messageType === "system") return pinnedMessage.content ?? "System message";
    return pinnedMessage.content?.trim() || "(empty message)";
  }, [pinnedMessage, pinnedMessageId]);

  return (
    <div
      className={`flex h-full min-h-[100dvh] flex-col ${
        effectiveTheme === "light" ? "gd-chat-light" : ""
      } ${
        isMobileLayout ? "bg-[#f3f4f6] text-slate-900" : styles.root
      } relative`}
    >
      <header
        className={`flex items-center border-b ${
          isMobileLayout
            ? "gap-2 border-slate-200/80 bg-white px-3 py-2.5"
            : `gap-3 px-4 py-3 ${styles.header}`
        }`}
      >
        <Link
          href="/messages"
          className={`rounded-full p-2 transition lg:hidden ${
            isMobileLayout ? "text-slate-500 hover:bg-slate-100" : styles.iconBtn
          } ${touch}`}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {otherUser?.id ? (
          <Link
            href={`/profile/${otherUser.id}`}
            className={`flex min-w-0 flex-1 items-center rounded-2xl px-1 py-1 ${isMobileLayout ? "gap-2" : "gap-3"} ${touch}`}
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 sm:h-10 sm:w-10">
                {otherUser.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span>{avatarText}</span>
                )}
              </div>
              {otherUser.online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              )}
            </div>

            <div className="min-w-0">
              <h2
                className={`truncate text-[15px] font-semibold leading-tight sm:text-sm ${
                  effectiveTheme === "light" ? "text-slate-900" : ""
                }`}
              >
                {displayName}
              </h2>
              {isMobileLayout ? (
                <p
                  className={`truncate text-xs ${
                    otherUserTyping || otherUser.online ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {mobileStatus}
                </p>
              ) : (
                <p
                  className={`truncate text-xs ${
                    effectiveTheme === "light" ? "text-slate-500" : styles.subtle
                  }`}
                >
                  {desktopStatus}
                </p>
              )}
            </div>
            {conversationMuted && (
              <span className="ml-1 inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Muted
              </span>
            )}
          </Link>
        ) : (
          <div className={`flex min-w-0 flex-1 items-center ${isMobileLayout ? "gap-2" : "gap-3"}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 sm:h-10 sm:w-10">
              {avatarText}
            </div>
            <div className="min-w-0">
              <h2
                className={`truncate text-[15px] font-semibold leading-tight sm:text-sm ${
                  effectiveTheme === "light" ? "text-slate-900" : ""
                }`}
              >
                {displayName}
              </h2>
              <p
                className={`truncate text-xs ${
                  isMobileLayout || effectiveTheme === "light"
                    ? "text-slate-400"
                    : styles.subtle
                }`}
              >
                Offline
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleVideoCall}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
            isMobileLayout
              ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              : `border-transparent ${styles.iconBtn}`
          } ${touch}`}
          aria-label="Video call"
        >
          <Video className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleCall}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
            isMobileLayout
              ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              : `border-transparent ${styles.iconBtn}`
          } ${touch}`}
          aria-label="Voice call"
        >
          <Phone className="h-4 w-4" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`rounded-full p-2 transition ${
              isMobileLayout
                ? "text-slate-500 hover:bg-slate-100"
                : styles.iconBtn
            } ${touch}`}
            aria-label="Chat actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div
              className={`absolute right-0 top-11 z-50 w-64 rounded-2xl border p-2 shadow-xl ${
                isMobileLayout ? "border-slate-200 bg-white text-slate-800" : styles.menu
              }`}
            >
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Chat Theme
              </p>
              <div className="mb-2 grid grid-cols-3 gap-1">
                {CHAT_THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setChatTheme(theme)}
                    className={`rounded-full px-2 py-2 text-[11px] font-semibold ${touch} ${
                      chatTheme === theme
                        ? "bg-emerald-500 text-white"
                        : styles.menuItem
                    }`}
                  >
                    {themeLabel[theme]}
                  </button>
                ))}
              </div>

              <div className="my-2 h-px bg-slate-400/20" />

              <button
                type="button"
                onClick={() => void handleToggleConversationMute()}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-500 ${styles.menuItem} ${touch}`}
              >
                <BellOff className="h-4 w-4" />
                {conversationMuted ? "Unmute conversation" : "Mute conversation"}
              </button>

              <button
                type="button"
                disabled={busyAction === "block"}
                onClick={() => void handleToggleBlock()}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm ${styles.menuItem} ${touch} ${
                  blockedByMe ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                <ShieldBan className="h-4 w-4" />
                {busyAction === "block"
                  ? "Please wait..."
                  : blockedByMe
                  ? "Unblock user"
                  : "Block user"}
              </button>

              <button
                type="button"
                disabled={busyAction === "report"}
                onClick={() => void handleReportUser()}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-amber-400 ${styles.menuItem} ${touch}`}
              >
                <Flag className="h-4 w-4" />
                {busyAction === "report" ? "Submitting..." : "Report user"}
              </button>
            </div>
          )}
        </div>
      </header>

      {notice && (
        <div
          className={`rounded-2xl px-3 py-2 text-xs ${
            isMobileLayout
              ? "mx-3 mt-2 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
              : `mx-4 mt-3 ${styles.notice}`
          }`}
        >
          {notice}
        </div>
      )}

      {pinnedMessageId && (
        <div
          className={`mx-3 mt-2 flex items-center gap-2 rounded-2xl px-3 py-2.5 ${
            isMobileLayout
              ? "bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.08)]"
              : effectiveTheme === "light"
              ? "mx-4 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              : styles.notice
          }`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Pin className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-500">
                Pinned Message
              </p>
              <p className="truncate text-xs">{pinnedPreview}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void jumpToPinnedMessage()}
            className={`h-8 rounded-full px-3 text-[11px] font-semibold ${
              isMobileLayout || effectiveTheme === "light"
                ? "bg-emerald-500 text-white"
                : "bg-white text-emerald-700"
            } ${touch}`}
          >
            View
          </button>
          <button
            type="button"
            onClick={() => void persistPinnedMessage(null)}
            className={`h-8 rounded-full px-3 text-[11px] font-semibold ${
              isMobileLayout || effectiveTheme === "light"
                ? "bg-slate-100 text-slate-500"
                : "bg-white/20 text-white"
            } ${touch}`}
          >
            Unpin
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto ${isMobileLayout ? "px-2.5 py-3" : "px-4 py-4"}`}
      >
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className={`mx-auto mb-4 block rounded-full px-4 py-1.5 text-xs transition ${
              isMobileLayout
                ? "bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                : styles.loadBtn
            } ${touch}`}
          >
            Load older messages
          </button>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="my-4 flex items-center justify-center">
              {isMobileLayout ? (
                <span className="text-[11px] font-medium text-slate-400">{group.date}</span>
              ) : (
                <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${styles.dateChip}`}>
                  {group.date}
                </span>
              )}
            </div>
            {group.msgs.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              const showReadReceipt = Boolean(isOwn && msg.id === lastOwnMessageId);
              const seenByOther = Boolean(
                isOwn &&
                  otherParticipantLastReadAt &&
                  new Date(otherParticipantLastReadAt).getTime() >=
                    new Date(msg.createdAt).getTime()
              );

              return (
                <div
                  key={msg.id}
                  ref={(node) => bindMessageNode(msg.id, node)}
                  className={`rounded-3xl transition-all duration-300 ${
                    highlightedMessageId === msg.id
                      ? "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-transparent"
                      : ""
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    theme={effectiveTheme}
                    canEdit={msg.senderId === currentUserId && msg.messageType === "text" && !chatLockedReason}
                    canReport={Boolean(currentUserId) && msg.senderId !== currentUserId}
                    canPin={Boolean(currentUserId)}
                    isPinned={msg.id === pinnedMessageId}
                    showReadReceipt={showReadReceipt}
                    readReceipt={seenByOther ? "seen" : "sent"}
                    readAt={seenByOther ? otherParticipantLastReadAt : null}
                    onEdit={handleEditMessage}
                    onReport={handleReportMessage}
                    onTogglePin={handleToggleMessagePin}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {!loading && messages.length === 0 && (
          <div className={`flex flex-col items-center justify-center text-slate-400 ${isMobileLayout ? "py-20" : "py-24"}`}>
            <div className="mb-4 rounded-full bg-emerald-50 p-6">
              <Send className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-sm font-medium">Start the conversation</p>
            <p className="mt-1 text-xs">Say hello</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isAtBottom && (
        <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-20 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setIsAtBottom(true);
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              void markAsRead();
            }}
            className={`pointer-events-auto flex h-10 items-center gap-1 rounded-full px-4 text-xs font-semibold ${
              isMobileLayout
                ? "bg-white text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.18)]"
                : "bg-emerald-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.35)]"
            } ${touch}`}
          >
            <ChevronDown className="h-4 w-4" />
            New messages
          </button>
        </div>
      )}

      <div
        className={
          isMobileLayout
            ? "border-t border-slate-200/80 bg-[#f3f4f6] p-2.5 pb-[calc(env(safe-area-inset-bottom)+0.65rem)]"
            : `border-t p-3 ${styles.inputBar}`
        }
      >
        {chatLockedReason && (
          <div
            className={`mb-2 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs ${
              isMobileLayout
                ? "bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
                : styles.notice
            }`}
          >
            <span>{chatLockedReason}</span>
            {blockedByMe && (
              <button
                type="button"
                onClick={() => void handleToggleBlock()}
                className={`rounded-full bg-emerald-500 px-3 py-1 text-white ${touch}`}
              >
                Unblock
              </button>
            )}
          </div>
        )}

        {showVoice ? (
          <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoice(false)} />
        ) : (
          <>
            <input
              id="chat-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSendImage}
              disabled={Boolean(chatLockedReason)}
            />
            <div className="flex items-end gap-2">
              <label
                htmlFor="chat-image-input"
                className={`hidden cursor-pointer rounded-full p-2 transition md:flex ${styles.iconBtn} ${touch}`}
              >
                <ImageIcon className="h-5 w-5" />
              </label>

              <div
                className={`flex flex-1 items-center ${
                  isMobileLayout
                    ? "min-h-[48px] rounded-full bg-white px-3 shadow-[0_8px_22px_rgba(15,23,42,0.07)]"
                    : `min-h-[44px] rounded-2xl border px-4 ${styles.inputShell}`
                }`}
              >
                <textarea
                  value={text}
                  onChange={(event) => handleTextChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => emitTyping(false)}
                  placeholder={isMobileLayout ? "Enter text" : "Type a message..."}
                  rows={1}
                  disabled={Boolean(chatLockedReason)}
                  className={`max-h-24 flex-1 resize-none bg-transparent text-sm outline-none ${
                    isMobileLayout ? "py-2.5 text-slate-800 placeholder:text-slate-400" : `py-2.5 ${styles.inputText}`
                  }`}
                />

                {isMobileLayout && (
                  <div className="ml-1 flex items-center gap-1">
                    <label
                      htmlFor="chat-image-input"
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 ${touch}`}
                    >
                      <Paperclip className="h-4 w-4" />
                    </label>
                    <label
                      htmlFor="chat-image-input"
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 ${touch}`}
                    >
                      <Camera className="h-4 w-4" />
                    </label>
                  </div>
                )}
              </div>

              {text.trim() ? (
                <button
                  onClick={() => void handleSendText()}
                  disabled={sending || Boolean(chatLockedReason)}
                  className={`flex items-center justify-center rounded-full text-white transition hover:bg-emerald-600 disabled:opacity-50 ${
                    isMobileLayout
                      ? `h-11 w-11 bg-emerald-500 shadow-[0_8px_22px_rgba(16,185,129,0.45)] ${touch}`
                      : `h-10 w-10 bg-emerald-500 ${touch}`
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowVoice(true)}
                  disabled={Boolean(chatLockedReason)}
                  className={`flex items-center justify-center rounded-full transition disabled:opacity-50 ${
                    isMobileLayout
                      ? `h-11 w-11 bg-white text-slate-500 shadow-[0_8px_22px_rgba(15,23,42,0.07)] ${touch}`
                      : `h-10 w-10 ${styles.iconBtn} ${touch}`
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}



