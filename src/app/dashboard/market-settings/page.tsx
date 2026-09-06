'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
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
import { MasterFlowManager } from '@/components/master-flow-manager';
import { NumberInput } from '@/components/number-input';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useMarketContext } from '@/context/market-context';
import { ApiError, apiClient, slugify } from '@/lib/api-client';
import type { CreateMarketPayload, Market } from '@/lib/types';

interface DomainVerificationInfo {
  recordName: string;
  recordValue: string;
  dnsTarget: { recordType: string; recordName: string; recordValue: string };
}

interface FormState {
  slug: string;
  name: string;
  domain: string;
  template_id: string;
  payment_due_hours: string;
  max_listing_days: string;
  registration_deadline_minutes: string;
  deposit_rounding_multiple: string;
  final_release_guaranty_days: string;
  requires_registration: boolean;
  requires_scheduled_start: boolean;
  min_description_length: string;
  max_description_length: string;
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
  deposit_rounding_multiple: '',
  final_release_guaranty_days: '',
  requires_registration: true,
  requires_scheduled_start: true,
  min_description_length: '0',
  max_description_length: '',
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
    deposit_rounding_multiple:
      market.deposit_rounding_multiple != null ? String(market.deposit_rounding_multiple) : '',
    final_release_guaranty_days: String(market.final_release_guaranty_days ?? 3),
    requires_registration: market.requires_registration ?? true,
    requires_scheduled_start: market.requires_scheduled_start ?? true,
    min_description_length: String(market.min_description_length ?? 0),
    max_description_length:
      market.max_description_length != null ? String(market.max_description_length) : '',
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
    // Sama seperti registration_deadline_minutes — null eksplisit saat kosong.
    deposit_rounding_multiple: form.deposit_rounding_multiple.trim()
      ? Number(form.deposit_rounding_multiple)
      : null,
    final_release_guaranty_days: form.final_release_guaranty_days.trim()
      ? Number(form.final_release_guaranty_days)
      : undefined,
    requires_registration: form.requires_registration,
    requires_scheduled_start: form.requires_scheduled_start,
    // Selalu dikirim sebagai angka (bukan undefined) — 0 itu sendiri nilai
    // valid ("tidak ada batas minimum"), beda dari "biarkan tidak berubah".
    min_description_length: form.min_description_length.trim() ? Number(form.min_description_length) : 0,
    // null eksplisit saat kosong — pola sama deposit_rounding_multiple.
    max_description_length: form.max_description_length.trim()
      ? Number(form.max_description_length)
      : null,
  };
}

export default function MarketSettingsPage() {
  const searchParams = useSearchParams();
  const { markets, activeMarket, isOwner, loading, refresh } = useMarketContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [domainVerifyInfo, setDomainVerifyInfo] = useState<DomainVerificationInfo | null>(null);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  const isCreating = isOwner && selectedId === null;

  const selectedMarket = useMemo(
    () => markets.find((m) => m.id === selectedId) ?? null,
    [markets, selectedId],
  );

  // Domain di form belum tentu domain yang sudah tersimpan (mis. user baru
  // ketik tapi belum klik "Simpan Perubahan") — verifikasi harus menargetkan
  // domain yang SUDAH persisted di `selectedMarket`, bukan draft form.
  const savedDomain = selectedMarket?.domain ?? '';
  const domainDirty = form.domain.trim() !== savedDomain;

  // Inisialisasi: Owner mulai dari list (belum ada yang dipilih, kecuali
  // sudah ada activeMarket dari switcher). Staff langsung diarahkan ke
  // Market yang jadi activeMarket-nya (tidak boleh pilih Market lain).
  useEffect(() => {
    if (loading) return;

    const wantsCreate = searchParams.get('mode') === 'create';
    if (wantsCreate) {
      setSelectedId(null);
      setForm(EMPTY_FORM);
      setSlugTouched(false);
      return;
    }

    if (!isOwner) {
      if (activeMarket) {
        setSelectedId(activeMarket.id);
        setForm(marketToForm(activeMarket));
        // Market SUDAH ADA — slug-nya final (mungkin sudah dipakai subdomain
        // hidup), jangan biarkan auto-slugify dari Nama diam-diam
        // menimpanya kalau user cuma bermaksud edit Nama.
        setSlugTouched(true);
      }
      return;
    }
    if (selectedId === null && activeMarket) {
      setSelectedId(activeMarket.id);
      setForm(marketToForm(activeMarket));
      setSlugTouched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isOwner, activeMarket, searchParams]);

  // Ganti Market yang diedit -> instruksi verifikasi domain Market
  // sebelumnya tidak relevan lagi, jangan biarkan nyangkut di layar.
  useEffect(() => {
    setDomainVerifyInfo(null);
    setDomainMessage(null);
    setDomainError(null);
  }, [selectedId]);

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

  async function handleVerifyDomain() {
    if (!selectedMarket) return;
    setVerifyingDomain(true);
    setDomainError(null);
    setDomainMessage(null);
    try {
      const info = await apiClient<DomainVerificationInfo>(
        `/api/markets/${selectedMarket.id}/domain/verify`,
        { method: 'POST' },
      );
      setDomainVerifyInfo(info);
    } catch (err) {
      setDomainError(err instanceof ApiError ? err.message : 'Gagal memulai verifikasi domain.');
    } finally {
      setVerifyingDomain(false);
    }
  }

  async function handleCheckDomain() {
    if (!selectedMarket) return;
    setCheckingDomain(true);
    setDomainError(null);
    setDomainMessage(null);
    try {
      await apiClient(`/api/markets/${selectedMarket.id}/domain/check`, { method: 'POST' });
      setDomainMessage('Domain berhasil diverifikasi.');
      await refresh();
    } catch (err) {
      setDomainError(err instanceof ApiError ? err.message : 'Gagal memeriksa status verifikasi.');
    } finally {
      setCheckingDomain(false);
    }
  }

  async function handleRemoveDomain() {
    if (!selectedMarket) return;
    if (!window.confirm('Hapus domain kustom Market ini? Verifikasi yang sudah ada juga akan direset.')) {
      return;
    }
    setRemovingDomain(true);
    setDomainError(null);
    setDomainMessage(null);
    try {
      await apiClient(`/api/markets/${selectedMarket.id}/domain`, { method: 'DELETE' });
      setDomainVerifyInfo(null);
      updateField('domain', '');
      await refresh();
      toast.success('Domain kustom berhasil dihapus.');
    } catch (err) {
      setDomainError(err instanceof ApiError ? err.message : 'Gagal menghapus domain.');
    } finally {
      setRemovingDomain(false);
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
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{isCreating ? 'Tambah Market Baru' : `Edit Market — ${form.name || '...'}`}</CardTitle>
          <CardDescription>
            {isCreating
              ? 'Isi detail Market baru. Slug dipakai untuk subdomain/URL publik.'
              : 'Perbarui pengaturan Market ini. Slug bisa diubah manual, tapi hati-hati — itu mengubah subdomain publik yang sedang aktif.'}
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
                />
                {!isCreating && (
                  <p className="text-xs text-amber-600">
                    Mengubah slug langsung mengubah subdomain publik Market ini — link/bookmark lama ke subdomain sebelumnya akan berhenti berfungsi.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="domain">Domain Kustom</Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(e) => updateField('domain', e.target.value)}
                  placeholder="antik-nusantara.com"
                />
                <p className="text-xs text-muted-foreground">
                  Domain milik Anda sendiri. Simpan dulu di sini, lalu verifikasi kepemilikannya di
                  bagian bawah halaman ini.
                </p>
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
              <div className="space-y-1.5">
                <Label htmlFor="deposit_rounding_multiple">Kelipatan Pembulatan Deposit</Label>
                <NumberInput
                  id="deposit_rounding_multiple"
                  value={form.deposit_rounding_multiple}
                  onChange={(raw) => updateField('deposit_rounding_multiple', raw)}
                  placeholder="Kosongkan jika tidak dibulatkan"
                />
                <p className="text-xs text-muted-foreground">
                  Nominal deposit hasil hitung persentase dibulatkan ke kelipatan terdekat angka
                  ini (mis. 10.000). Kosongkan untuk tidak dibulatkan.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="final_release_guaranty_days">Masa Garansi Konfirmasi Terima (hari)</Label>
                <NumberInput
                  id="final_release_guaranty_days"
                  value={form.final_release_guaranty_days}
                  onChange={(raw) => updateField('final_release_guaranty_days', raw)}
                  placeholder="3"
                />
                <p className="text-xs text-muted-foreground">
                  Kalau buyer tidak klik &ldquo;Konfirmasi Terima Barang&rdquo; dalam masa ini
                  (dihitung sejak semua step Master Flow selesai, atau sejak lunas kalau Market ini
                  tidak punya Master Flow), sisa dana otomatis dirilis ke seller.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min_description_length">Batas Minimum Deskripsi Produk (karakter)</Label>
                <NumberInput
                  id="min_description_length"
                  value={form.min_description_length}
                  onChange={(raw) => updateField('min_description_length', raw)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Panjang teks minimum (tanpa HTML) yang wajib diisi seller sebelum bisa publish
                  produk. Isi 0 untuk tidak membatasi.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_description_length">Batas Maksimum Deskripsi Produk (karakter)</Label>
                <NumberInput
                  id="max_description_length"
                  value={form.max_description_length}
                  onChange={(raw) => updateField('max_description_length', raw)}
                  placeholder="Kosongkan jika tidak ada batas"
                />
                <p className="text-xs text-muted-foreground">
                  Panjang teks maksimum yang boleh diisi seller. Kosongkan untuk tidak membatasi.
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="requires_registration"
                  checked={form.requires_registration}
                  onChange={(e) => updateField('requires_registration', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="requires_registration">Wajibkan Registrasi &amp; Deposit</Label>
                  <p className="text-xs text-muted-foreground">
                    Nonaktifkan supaya buyer bisa langsung menawar tanpa registrasi/deposit di depan —
                    alamat kirim pemenang dikumpulkan saat pelunasan.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="requires_scheduled_start"
                  checked={form.requires_scheduled_start}
                  onChange={(e) => updateField('requires_scheduled_start', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="requires_scheduled_start">Wajibkan Jadwal Mulai Lelang</Label>
                  <p className="text-xs text-muted-foreground">
                    Nonaktifkan supaya seller boleh publish tanpa mengisi tanggal mulai — lelang
                    langsung buka begitu dipublish (tanggal tutup tetap wajib).
                  </p>
                </div>
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

      {!isCreating && selectedMarket && savedDomain && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Verifikasi Domain Kustom</CardTitle>
            <CardDescription>
              Domain kustom Anda sendiri (bukan subdomain bagdja) — TLS/HTTPS untuk domain ini menjadi
              tanggung jawab Anda lewat akun Cloudflare Anda sendiri, bukan diurus dari sisi kami.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainDirty ? (
              <p className="text-sm text-amber-600">
                Domain di form belum disimpan. Klik &ldquo;Simpan Perubahan&rdquo; di atas dulu sebelum
                memverifikasi <strong>{form.domain.trim() || savedDomain}</strong>.
              </p>
            ) : (
              <p className="text-sm">
                Status: {selectedMarket.domain_verified_at ? (
                  <span className="font-medium text-emerald-600">
                    Terverifikasi ✓ sejak {new Date(selectedMarket.domain_verified_at).toLocaleString('id-ID')}
                  </span>
                ) : (
                  <span className="font-medium text-amber-600">Belum diverifikasi</span>
                )}
              </p>
            )}

            {domainMessage && <p className="text-sm text-emerald-600">{domainMessage}</p>}
            {domainError && <p className="text-sm text-destructive">{domainError}</p>}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={domainDirty || verifyingDomain}
                onClick={handleVerifyDomain}
              >
                {verifyingDomain
                  ? 'Memuat…'
                  : selectedMarket.domain_verified_at
                    ? 'Verifikasi Ulang'
                    : 'Verifikasi Domain'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={domainDirty || checkingDomain}
                onClick={handleCheckDomain}
              >
                {checkingDomain ? 'Memeriksa…' : 'Cek Status'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={removingDomain}
                onClick={handleRemoveDomain}
              >
                {removingDomain ? 'Menghapus…' : 'Hapus Domain'}
              </Button>
            </div>

            {domainVerifyInfo && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
                <div>
                  <p className="font-medium">1. Tambahkan TXT record ini di penyedia DNS Anda (bukti kepemilikan):</p>
                  <p className="mt-1 font-mono text-xs break-all">
                    Nama: {domainVerifyInfo.recordName}
                    <br />
                    Nilai: {domainVerifyInfo.recordValue}
                  </p>
                </div>
                <div>
                  <p className="font-medium">2. Arahkan domain ke platform kami:</p>
                  <p className="mt-1 font-mono text-xs break-all">
                    {domainVerifyInfo.dnsTarget.recordType} record — {domainVerifyInfo.dnsTarget.recordName} →{' '}
                    {domainVerifyInfo.dnsTarget.recordValue || '(hubungi kami untuk nilai ini)'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">3. Aktifkan HTTPS lewat Cloudflare Anda sendiri:</p>
                  <p className="mt-1 text-muted-foreground">
                    Daftarkan domain ini di akun Cloudflare Anda, aktifkan proxy (awan oranye), lalu set
                    mode SSL/TLS ke &ldquo;Full&rdquo;. Cloudflare akan otomatis mengurus sertifikat HTTPS
                    untuk pengunjung Anda — bukan tanggung jawab kami.
                  </p>
                </div>
                <p className="text-muted-foreground">
                  Setelah TXT record ditambahkan (bisa perlu beberapa menit untuk propagasi), klik
                  &ldquo;Cek Status&rdquo; di atas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isCreating && selectedMarket && (
        <div className="space-y-6 pt-6">
          {form.requires_registration && <DepositTierManager marketId={selectedMarket.id} />}
          <MasterFlowManager marketId={selectedMarket.id} />
        </div>
      )}
    </div>
  );
}
