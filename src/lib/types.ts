/**
 * Tipe data yang dipertukarkan dengan `bagdja-auction-api`.
 * Lihat kontrak endpoint di execution-plan.md Fase 0 / prompt tugas ini —
 * ASUMSIKAN shape ini persis sampai ada perubahan eksplisit dari sisi API.
 */
export interface Market {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  template_id: string | null;
  deposit_tier_config: unknown;
  payment_due_hours: number | null;
  max_listing_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketsResponse {
  isOwner: boolean;
  markets: Market[];
}

export interface MarketStaff {
  id: string;
  market_id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export type MarketStaffInvitationStatus = 'pending' | 'expired' | 'accepted';

export interface MarketStaffInvitation {
  id: string;
  email: string;
  status: MarketStaffInvitationStatus;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface CreateMarketPayload {
  slug: string;
  name: string;
  domain?: string;
  template_id?: string;
  deposit_tier_config?: unknown;
  payment_due_hours?: number;
  max_listing_days?: number;
}

export type UpdateMarketPayload = Partial<CreateMarketPayload>;
