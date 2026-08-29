/**
 * Config deposit tier Market — disimpan sebagai JSONB bebas di backend
 * (`markets.deposit_tier_config`, dipakai mulai Fase 3 bidding), jadi bentuk
 * array `{min, max, price}[]` ini murni keputusan sisi Admin Console, bukan
 * kontrak yang di-enforce backend.
 */
export interface DepositTierRow {
  /** Key lokal untuk React list, bukan bagian dari payload. */
  key: string;
  min: string;
  max: string;
  price: string;
}

export function emptyTierRow(): DepositTierRow {
  return { key: crypto.randomUUID(), min: '', max: '', price: '' };
}

/** Parse `market.deposit_tier_config` (unknown, dari API) jadi baris form. */
export function parseDepositTierConfig(config: unknown): DepositTierRow[] {
  if (Array.isArray(config)) {
    return config
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        key: crypto.randomUUID(),
        min: item.min != null ? String(item.min) : '',
        max: item.max != null ? String(item.max) : '',
        price: item.price != null ? String(item.price) : '',
      }));
  }

  // Toleransi format lama "min-max": price (object map) kalau ada data yang
  // sempat disimpan lewat textarea JSON bebas sebelum UI ini ada.
  if (config && typeof config === 'object') {
    return Object.entries(config as Record<string, unknown>).map(([rangeKey, price]) => {
      const [min, max] = rangeKey.split('-');
      return {
        key: crypto.randomUUID(),
        min: min ?? '',
        max: max ?? '',
        price: price != null ? String(price) : '',
      };
    });
  }

  return [];
}

/**
 * Bangun payload dari baris form — baris kosong (tanpa min & price) diabaikan.
 * Dilempar Error kalau ada baris terisi sebagian tapi tidak valid, supaya
 * caller bisa tampilkan pesan sebelum submit (harusnya sudah dicegah oleh
 * `validateDepositTiers`, ini cuma jaring pengaman terakhir).
 *
 * Bentuk output object map `"min-max": price` (BUKAN array) — kontrak
 * backend (`CreateMarketDto.deposit_tier_config`) memvalidasi field ini
 * dengan `@IsObject()`, yang menolak array. Baris tanpa Maks (rentang tanpa
 * batas atas) dikodekan sebagai `"min-"` (trailing hyphen, sisi kanan
 * kosong) — lihat `parseDepositTierConfig` untuk sisi kebalikannya.
 */
export function buildDepositTierConfig(rows: DepositTierRow[]): Record<string, number> | undefined {
  const filled = rows.filter((r) => r.min.trim() !== '' || r.price.trim() !== '' || r.max.trim() !== '');
  if (filled.length === 0) return undefined;

  const result: Record<string, number> = {};
  for (const r of filled) {
    const min = Number(r.min);
    const price = Number(r.price);
    const max = r.max.trim() === '' ? null : Number(r.max);
    if (!Number.isFinite(min) || !Number.isFinite(price) || (max !== null && !Number.isFinite(max))) {
      throw new Error('Config deposit tier ada baris yang tidak valid.');
    }
    result[`${min}-${max ?? ''}`] = price;
  }
  return result;
}

/**
 * Validasi baris form: tiap baris terisi harus punya min & price valid
 * (angka >= 0), max (kalau diisi) harus > min, dan rentang antar baris tidak
 * boleh overlap. Return pesan error pertama yang ditemukan, atau `null`
 * kalau semua valid.
 */
export function validateDepositTiers(rows: DepositTierRow[]): string | null {
  const filled = rows.filter((r) => r.min.trim() !== '' || r.max.trim() !== '' || r.price.trim() !== '');

  const parsed: Array<{ label: string; min: number; max: number | null; price: number }> = [];

  for (const row of filled) {
    const rowLabel = `Baris "${row.min || '?'}–${row.max || '∞'}"`;

    if (row.min.trim() === '') return `${rowLabel}: kolom Min wajib diisi.`;
    const min = Number(row.min);
    if (!Number.isFinite(min) || min < 0) return `${rowLabel}: Min harus angka ≥ 0.`;

    if (row.price.trim() === '') return `${rowLabel}: kolom Deposit wajib diisi.`;
    const price = Number(row.price);
    if (!Number.isFinite(price) || price < 0) return `${rowLabel}: Deposit harus angka ≥ 0.`;

    let max: number | null = null;
    if (row.max.trim() !== '') {
      max = Number(row.max);
      if (!Number.isFinite(max)) return `${rowLabel}: Maks harus angka.`;
      if (max <= min) return `${rowLabel}: Maks harus lebih besar dari Min.`;
    }

    parsed.push({ label: rowLabel, min, max, price });
  }

  const sorted = [...parsed].sort((a, b) => a.min - b.min);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.max === null) {
      return `${current.label}: rentang tanpa batas atas (Maks kosong) harus jadi baris dengan Min tertinggi — ada rentang lain (${next.label}) di atasnya.`;
    }

    if (next.min <= current.max) {
      return `${current.label} tumpang tindih dengan ${next.label} — rentangnya bersinggungan.`;
    }
  }

  return null;
}
