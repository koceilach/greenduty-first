/* ──────────────────────────────────────────────────────────
   Messages – shared types
   ────────────────────────────────────────────────────────── */

export type MessageType = "text" | "voice" | "image" | "system";

export type MessageEdit = {
  previousContent: string | null;
  newContent: string | null;
  editedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  messageType: MessageType;
  mediaUrl: string | null;
  mediaDuration: number | null;
  replyToId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  editedAt?: string | null;
  editHistory?: MessageEdit[];
  /* joined */
  sender?: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  replyTo?: Pick<Message, "id" | "content" | "messageType" | "sender"> | null;
};

export type Conversation = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isMuted?: boolean;
  /* computed client-side */
  lastMessage?: Message | null;
  unreadCount: number;
  participants: ConversationParticipant[];
  /** The "other" user in a DM */
  otherUser?: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    online: boolean;
  };
};

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  role: "member" | "admin";
  joinedAt: string;
  lastReadAt: string | null;
  isPinned?: boolean;
  isMuted?: boolean;
  pinnedMessageId?: string | null;
  profile?: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

export type UserPresence = {
  userId: string;
  status: "online" | "offline" | "away";
  lastSeenAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type:
    | "like"
    | "comment"
    | "comment_reply"
    | "follow"
    | "message"
    | "mention"
    | "repost_story"
    | "system";
  title: string;
  body: string;
  actorId: string | null;
  resourceType: "post" | "comment" | "conversation" | "profile" | "story" | null;
  resourceId: string | null;
  read: boolean;
  createdAt: string;
  groupCount?: number;
  actor?: {
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};
