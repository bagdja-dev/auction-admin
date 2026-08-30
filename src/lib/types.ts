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
  /** @deprecated Fase 3 mengganti dengan tabel relasional `deposit_tier_configs` (lihat `DepositTierConfig`). */
  deposit_tier_config: unknown;
  payment_due_hours: number | null;
  max_listing_days: number | null;
  /** Menit sebelum lelang dimulai, pendaftaran peserta otomatis ditutup. `null` = tidak ada batas. */
  registration_deadline_minutes: number | null;
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

export type MarketStaffInvitationStatus = 'pending' | 'expired';

export interface MarketStaffInvitation {
  id: string;
  email: string;
  status: MarketStaffInvitationStatus;
  created_at: string;
  expires_at: string;
}

export interface CreateMarketPayload {
  slug: string;
  name: string;
  domain?: string;
  template_id?: string;
  payment_due_hours?: number;
  max_listing_days?: number;
  /** Menit sebelum lelang dimulai, pendaftaran peserta otomatis ditutup. Kirim `null` eksplisit untuk menghapus batas. */
  registration_deadline_minutes?: number | null;
}

export type UpdateMarketPayload = Partial<CreateMarketPayload>;

export interface Seller {
  id: string;
  market_id: string;
  user_id: string;
  shop_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductModeJual = 'AUCTION' | 'DIRECT_SELL';

export type ProductStatus = 'draft' | 'published' | 'sold' | 'expired';

export interface Product {
  id: string;
  market_id: string;
  seller_id: string;
  slug: string;
  name: string;
  description: string | null;
  images: string[] | null;
  mode_jual: ProductModeJual;
  status: ProductStatus;
  price: number;
  min_increment: number | null;
  auction_start_at: string | null;
  auction_end_at: string | null;
  stock: number;
  re_listed_from_id: string | null;
  current_highest_bid: number | null;
  highest_bidder_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Baris config deposit tier — tabel relasional `deposit_tier_configs`
 * (Fase 3), menggantikan `Market.deposit_tier_config` (JSONB, deprecated).
 */
export interface DepositTierConfig {
  id: string;
  market_id: string;
  min_price: number;
  max_price: number | null;
  deposit_amount: number;
  created_at: string;
  updated_at: string;
}

/** Payload `PUT /api/markets/:marketId/deposit-tier-configs` — replace-all, bukan patch satu-satu. */
export interface DepositTierConfigPayload {
  min_price: number;
  max_price?: number | null;
  deposit_amount: number;
}

export interface Bid {
  id: string;
  product_id: string;
  bidder_user_id: string;
  amount: number;
  created_at: string;
}
