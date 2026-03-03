export type PlatformRole = "user" | "moderator" | "admin";

export type SellerRequestStatus = "pending" | "approved" | "denied";
export type SellerRequestDecision = "approved" | "denied";

export type MarketDisputeStatus = "pending" | "reviewing" | "resolved" | "closed";

export type EduReportStatus = "open" | "reviewed" | "dismissed" | "action_taken";

export type UserModerationAction = "ban_user" | "delete_post" | "ban_seller";

export type ModerationUserProfile = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: PlatformRole;
  isBanned: boolean;
};

export type SellerRequestRow = {
  id: string;
  userId: string;
  requestedStoreName: string | null;
  requestedBio: string | null;
  status: SellerRequestStatus;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  requester: ModerationUserProfile | null;
  requesterMarketplace: {
    storeName: string | null;
    marketplaceRole: string | null;
  } | null;
};

export type MarketDisputeRow = {
  id: string;
  sourceDisputeId: string | null;
  buyerId: string;
  sellerId: string;
  productId: string | null;
  reason: string;
  description: string;
  status: MarketDisputeStatus;
  evidenceUrl: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: ModerationUserProfile | null;
  seller: ModerationUserProfile | null;
  product: {
    id: string;
    title: string;
    imageUrl: string | null;
    priceDzd: number | null;
  } | null;
};

export type EduPostReportRow = {
  id: string;
  postId: string;
  reporterId: string;
  postAuthorId: string | null;
  reason: string;
  details: string | null;
  status: EduReportStatus;
  actionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reporter: ModerationUserProfile | null;
  postAuthor: ModerationUserProfile | null;
  post: {
    id: string;
    title: string;
    body: string | null;
    status: string;
    createdAt: string;
  } | null;
  reels: Array<{
    id: string;
    caption: string;
    videoUrl: string;
    createdAt: string;
  }>;
};

export type ModerationDashboardPayload = {
  actorId: string;
  actorRole: PlatformRole;
  sellerRequests: SellerRequestRow[];
  marketDisputes: MarketDisputeRow[];
  eduReports: EduPostReportRow[];
};

export type ModerationDashboardResult =
  | {
      ok: true;
      payload: ModerationDashboardPayload;
      error: null;
    }
  | {
      ok: false;
      payload: null;
      error: string;
    };

export type ModerationActionResult = {
  ok: boolean;
  error: string | null;
};
