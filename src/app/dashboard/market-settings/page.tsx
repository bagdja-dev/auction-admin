'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DepositTierManager } from '@/components/deposit-tier-manager';
import { NumberInput } from '@/components/number-input';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useMarketContext } from '@/context/market-context';
import { ApiError, apiClient, slugify } from '@/lib/api-client';
import type { CreateMarketPayload, Market } from '@/lib/types';

interface FormState {
  slug: string;
  name: string;
  domain: string;
  template_id: string;
  payment_due_hours: string;
  max_listing_days: string;
  registration_deadline_minutes: string;
}

/**
 * Daftar template renderer yang tersedia — HARUS sinkron manual dengan
 * `components/templates/registry.ts` di repo `bagdja-auction-web` (renderer
 * publik), karena keduanya repo terpisah. Tambah entry baru di sini begitu
 * template baru didaftarkan di registry itu.
 */
const TEMPLATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'grand', label: 'Grand (Pinterest Masonry)' },
];

const EMPTY_FORM: FormState = {
  slug: '',
  name: '',
  domain: '',
  template_id: 'default',
  payment_due_hours: '',
  max_listing_days: '',
  registration_deadline_minutes: '',
};

function marketToForm(market: Market): FormState {
  return {
    slug: market.slug ?? '',
    name: market.name ?? '',
    domain: market.domain ?? '',
    template_id: market.template_id ?? 'default',
    payment_due_hours: market.payment_due_hours != null ? String(market.payment_due_hours) : '',
    max_listing_days: market.max_listing_days != null ? String(market.max_listing_days) : '',
    registration_deadline_minutes:
      market.registration_deadline_minutes != null ? String(market.registration_deadline_minutes) : '',
  };
}

function buildPayload(form: FormState): CreateMarketPayload {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    domain: form.domain.trim() || undefined,
    template_id: form.template_id.trim() || undefined,
    payment_due_hours: form.payment_due_hours.trim() ? Number(form.payment_due_hours) : undefined,
    max_listing_days: form.max_listing_days.trim() ? Number(form.max_listing_days) : undefined,
    // Selalu dikirim (bukan `undefined` saat kosong) — `null` eksplisit
    // memberitahu backend "hapus batas", bukan "biarkan tidak berubah".
    registration_deadline_minutes: form.registration_deadline_minutes.trim()
      ? Number(form.registration_deadline_minutes)
      : null,
  };
}

export default function MarketSettingsPage() {
  const { markets, activeMarket, isOwner, loading, refresh } = useMarketContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const isCreating = isOwner && selectedId === null;

  const selectedMarket = useMemo(
    () => markets.find((m) => m.id === selectedId) ?? null,
    [markets, selectedId],
  );

  // Inisialisasi: Owner mulai dari list (belum ada yang dipilih, kecuali
  // sudah ada activeMarket dari switcher). Staff langsung diarahkan ke
  // Market yang jadi activeMarket-nya (tidak boleh pilih Market lain).
  useEffect(() => {
    if (loading) return;
    if (!isOwner) {
      if (activeMarket) {
        setSelectedId(activeMarket.id);
        setForm(marketToForm(activeMarket));
      }
      return;
    }
    if (selectedId === null && activeMarket) {
      setSelectedId(activeMarket.id);
      setForm(marketToForm(activeMarket));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isOwner, activeMarket]);

  function startCreate() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
  }

  function selectMarket(market: Market) {
    setSelectedId(market.id);
    setForm(marketToForm(market));
    setSlugTouched(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !slugTouched) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = buildPayload(form);

      if (isCreating) {
        const created = await apiClient<Market>('/api/markets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success(`Market "${created.name}" berhasil dibuat.`);
      } else if (selectedMarket) {
        const updated = await apiClient<Market>(`/api/markets/${selectedMarket.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success(`Market "${updated.name}" berhasil disimpan.`);
      }

      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.status === 403 ? 'Hanya Owner yang boleh membuat Market baru.' : err.message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Gagal menyimpan Market.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Memuat data Market…" />;
  }

  if (!isOwner && !activeMarket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Belum ada Market</CardTitle>
          <CardDescription>
            Anda belum terdaftar sebagai staff di Market manapun. Hubungi Owner untuk mendapatkan undangan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {isOwner && (
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Daftar Market</CardTitle>
            <Button size="icon" variant="outline" onClick={startCreate} aria-label="Tambah Market">
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {markets.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada Market. Klik + untuk membuat.</p>
            )}
            {markets.map((market) => (
              <button
                key={market.id}
                onClick={() => selectMarket(market)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === market.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
              >
                <span className="truncate">{market.name}</span>
                {!market.is_active && (
                  <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                    Nonaktif
                  </Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isCreating ? 'Tambah Market Baru' : `Edit Market — ${form.name || '...'}`}</CardTitle>
          <CardDescription>
            {isCreating
              ? 'Isi detail Market baru. Slug dipakai untuk subdomain/URL publik.'
              : 'Perbarui pengaturan Market ini.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Market</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Antik Nusantara"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField('slug', slugify(e.target.value));
                  }}
                  placeholder="antik-nusantara"
                  required
                  disabled={!isCreating}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="domain">Domain Kustom</Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(e) => updateField('domain', e.target.value)}
                  placeholder="antik-nusantara.market.bagdja.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template_id">Template Renderer</Label>
                <Select
                  value={form.template_id}
                  onValueChange={(value) => updateField('template_id', value)}
                >
                  <SelectTrigger id="template_id" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment_due_hours">Batas Waktu Pelunasan (jam)</Label>
                <NumberInput
                  id="payment_due_hours"
                  value={form.payment_due_hours}
                  onChange={(raw) => updateField('payment_due_hours', raw)}
                  placeholder="24"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_listing_days">Maks. Umur Listing (hari)</Label>
                <NumberInput
                  id="max_listing_days"
                  value={form.max_listing_days}
                  onChange={(raw) => updateField('max_listing_days', raw)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration_deadline_minutes">Batas Waktu Pendaftaran Lelang (menit)</Label>
                <NumberInput
                  id="registration_deadline_minutes"
                  value={form.registration_deadline_minutes}
                  onChange={(raw) => updateField('registration_deadline_minutes', raw)}
                  placeholder="Kosongkan jika tidak ada batas"
                />
                <p className="text-xs text-muted-foreground">
                  Menit sebelum lelang dimulai, pendaftaran peserta otomatis ditutup. Kosongkan
                  untuk tidak membatasi.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan…' : isCreating ? 'Buat Market' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isCreating && selectedMarket && (
        <div className="lg:col-start-2">
          <DepositTierManager marketId={selectedMarket.id} />
        </div>
      )}
    </div>
  );
}
