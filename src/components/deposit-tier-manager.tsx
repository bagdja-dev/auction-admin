'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/number-input';
import { ApiError, apiClient } from '@/lib/api-client';
import type { DepositTierConfig, DepositTierConfigPayload } from '@/lib/types';

/**
 * Manajer "Konfigurasi Deposit Tier" — Fase 3, berbasis tabel relasional
 * `deposit_tier_configs` via API (`GET`/`PUT /api/markets/:marketId/deposit-tier-configs`).
 * MENGGANTIKAN `DepositTierEditor` lama (`components/deposit-tier-editor.tsx`)
 * yang bekerja di atas field JSONB `Market.deposit_tier_config` (deprecated).
 *
 * Punya tombol simpan sendiri ("Simpan Tier Deposit") karena ini API terpisah
 * dari form pengaturan Market — tidak ikut submit form Market.
 */
interface TierRow {
  /** Key lokal untuk React list — id asli dari API kalau baris sudah tersimpan, UUID acak kalau baris baru. */
  key: string;
  min: string;
  max: string;
  price: string;
}

function emptyRow(): TierRow {
  return { key: crypto.randomUUID(), min: '', max: '', price: '' };
}

function tierToRow(tier: DepositTierConfig): TierRow {
  return {
    key: tier.id,
    min: String(tier.min_price),
    max: tier.max_price != null ? String(tier.max_price) : '',
    price: String(tier.deposit_amount),
  };
}

/**
 * Validasi client-side sebelum submit supaya UX cepat (langsung tahu salah
 * tanpa round-trip) — backend tetap validasi ulang overlap & urutan saat PUT.
 */
function validateRows(rows: TierRow[]): string | null {
  const filled = rows.filter((r) => r.min.trim() !== '' || r.max.trim() !== '' || r.price.trim() !== '');

  const parsed: Array<{ label: string; min: number; max: number | null; price: number }> = [];

  for (const row of filled) {
    const rowLabel = `Baris "${row.min || '?'}–${row.max || '∞'}"`;

    if (row.min.trim() === '') return `${rowLabel}: kolom Harga Min wajib diisi.`;
    const min = Number(row.min);
    if (!Number.isFinite(min) || min < 0) return `${rowLabel}: Harga Min harus angka ≥ 0.`;

    if (row.price.trim() === '') return `${rowLabel}: kolom Deposit wajib diisi.`;
    const price = Number(row.price);
    if (!Number.isFinite(price) || price < 0) return `${rowLabel}: Deposit harus angka ≥ 0.`;

    let max: number | null = null;
    if (row.max.trim() !== '') {
      max = Number(row.max);
      if (!Number.isFinite(max)) return `${rowLabel}: Harga Maks harus angka.`;
      if (max <= min) return `${rowLabel}: Harga Maks harus lebih besar dari Harga Min.`;
    }

    parsed.push({ label: rowLabel, min, max, price });
  }

  const sorted = [...parsed].sort((a, b) => a.min - b.min);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.max === null) {
      return `${current.label}: rentang tanpa batas atas (Maks kosong) harus jadi baris dengan Harga Min tertinggi — ada rentang lain (${next.label}) di atasnya.`;
    }

    if (next.min <= current.max) {
      return `${current.label} tumpang tindih dengan ${next.label} — rentangnya bersinggungan.`;
    }
  }

  return null;
}

export function DepositTierManager({ marketId }: { marketId: string }) {
  const [rows, setRows] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<DepositTierConfig[]>(`/api/markets/${marketId}/deposit-tier-configs`);
      setRows(data.map(tierToRow));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat config deposit tier.');
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRow(key: string, field: 'min' | 'max' | 'price', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const clientError = validateRows(rows);

  async function handleSave() {
    const error = validateRows(rows);
    if (error) {
      toast.error(error);
      return;
    }

    const filled = rows.filter((r) => r.min.trim() !== '' || r.max.trim() !== '' || r.price.trim() !== '');
    const payload: DepositTierConfigPayload[] = filled.map((r) => ({
      min_price: Number(r.min),
      max_price: r.max.trim() === '' ? null : Number(r.max),
      deposit_amount: Number(r.price),
    }));

    setSaving(true);
    try {
      const data = await apiClient<DepositTierConfig[]>(`/api/markets/${marketId}/deposit-tier-configs`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setRows(data.map(tierToRow));
      toast.success('Config deposit tier berhasil disimpan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan config deposit tier.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfigurasi Deposit Tier</CardTitle>
        <CardDescription>
          Nominal deposit yang harus dibayar peserta lelang berdasarkan rentang harga produk.
          Kosongkan Maks pada baris terakhir untuk rentang tanpa batas atas. Perubahan di sini
          disimpan terpisah dari pengaturan Market di atas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat config deposit tier…</p>
        ) : (
          <>
            {rows.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 text-xs text-muted-foreground">
                <Label className="text-xs text-muted-foreground">Harga min</Label>
                <Label className="text-xs text-muted-foreground">Harga maks</Label>
                <Label className="text-xs text-muted-foreground">Deposit</Label>
                <span />
              </div>
            )}

            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                  <NumberInput
                    value={row.min}
                    onChange={(raw) => updateRow(row.key, 'min', raw)}
                    placeholder="0"
                    aria-label="Harga minimum"
                  />
                  <NumberInput
                    value={row.max}
                    onChange={(raw) => updateRow(row.key, 'max', raw)}
                    placeholder="Tak terbatas"
                    aria-label="Harga maksimum"
                  />
                  <NumberInput
                    value={row.price}
                    onChange={(raw) => updateRow(row.key, 'price', raw)}
                    placeholder="10.000"
                    aria-label="Nominal deposit"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(row.key)}
                    aria-label="Hapus baris"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" />
              Tambah Rentang
            </Button>

            {clientError && <p className="text-xs font-medium text-destructive">{clientError}</p>}

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={handleSave} disabled={saving || !!clientError}>
                {saving ? 'Menyimpan…' : 'Simpan Tier Deposit'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
