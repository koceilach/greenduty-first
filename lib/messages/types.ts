/* ──────────────────────────────────────────────────────────
   Messages – shared types
   ────────────────────────────────────────────────────────── */

export type MessageType = "text" | "voice" | "image" | "system";

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
  type: "like" | "comment" | "follow" | "message" | "mention" | "system";
  title: string;
  body: string;
  actorId: string | null;
  resourceType: "post" | "comment" | "conversation" | "profile" | null;
  resourceId: string | null;
  read: boolean;
  createdAt: string;
  actor?: {
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};
