export const DISPUTE_STATUSES = ["pending", "reviewing", "resolved", "closed"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_REASONS = [
  "Item not as described",
  "Broken or damaged",
  "Never arrived",
  "Wrong item received",
  "Suspicious seller behavior",
] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export type OpenDisputeResult = {
  ok: boolean;
  error: string | null;
  disputeId?: string;
};

export type AdminDisputeRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  evidence_url: string | null;
  evidence_signed_url: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  buyer: {
    id: string;
    username: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  seller: {
    id: string;
    username: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
  product: {
    id: string;
    title: string | null;
    image_url: string | null;
    price_dzd: number | null;
  } | null;
};

export type AdminDisputesResult = {
  ok: boolean;
  error: string | null;
  disputes: AdminDisputeRow[];
};

export type ResolveDisputeResult = {
  ok: boolean;
  error: string | null;
};
