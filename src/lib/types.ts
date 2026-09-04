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
  /** Kelipatan pembulatan nominal deposit hasil hitung persentase (dibulatkan ke terdekat). `null` = tidak dibulatkan. */
  deposit_rounding_multiple: number | null;
  /** Masa garansi (hari) sebelum "Konfirmasi Terima Barang" di-auto-release kalau buyer tidak pernah klik (Fase 5). */
  final_release_guaranty_days: number;
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
  /** Kelipatan pembulatan nominal deposit. Kirim `null` eksplisit untuk menghapus (tidak dibulatkan). */
  deposit_rounding_multiple?: number | null;
  /** Masa garansi (hari) sebelum "Konfirmasi Terima Barang" di-auto-release kalau buyer tidak pernah klik. */
  final_release_guaranty_days?: number;
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
  /** Persentase dari harga produk, 0-100. */
  deposit_percentage: number;
  min_deposit: number | null;
  max_deposit: number | null;
  created_at: string;
  updated_at: string;
}

/** Payload `PUT /api/markets/:marketId/deposit-tier-configs` — replace-all, bukan patch satu-satu. */
export interface DepositTierConfigPayload {
  min_price: number;
  max_price?: number | null;
  deposit_percentage: number;
  min_deposit?: number | null;
  max_deposit?: number | null;
}

export interface Bid {
  id: string;
  product_id: string;
  bidder_user_id: string;
  amount: number;
  created_at: string;
}

export type MasterFlowFormFieldType = 'text' | 'textarea' | 'number' | 'image_url';

export interface MasterFlowFormField {
  key: string;
  label: string;
  type: MasterFlowFormFieldType;
  required: boolean;
}

/** Satu step Master Flow (Fase 5) — SATU Master Flow berlaku untuk semua produk di Market ini. */
export interface MasterFlowStep {
  id: string;
  market_id: string;
  sequence: number;
  status_name: string;
  description: string | null;
  process_day: number | null;
  form_schema: MasterFlowFormField[] | null;
  release_percentage: number | null;
  guaranty_days: number | null;
  created_at: string;
  updated_at: string;
}

/** Payload `PUT /api/markets/:marketId/master-flow-steps` — replace-all, bukan patch satu-satu. */
export interface MasterFlowStepPayload {
  status_name: string;
  description?: string | null;
  process_day?: number | null;
  form_schema?: MasterFlowFormField[] | null;
  release_percentage?: number | null;
  guaranty_days?: number | null;
}

export type AuctionRegistrationStatus = 'PENDING_PAYMENT' | 'HELD' | 'REFUNDED' | 'FORFEITED';

export interface AuctionRegistration {
  id: string;
  market_id: string;
  product_id: string;
  buyer_user_id: string;
  recipient_name: string;
  phone: string;
  address: string;
  destination_area_id: string;
  destination_area_name: string;
  deposit_amount: number;
  currency: string;
  escrow_id: string | null;
  payment_request_id: string | null;
  checkout_url: string | null;
  status: AuctionRegistrationStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
