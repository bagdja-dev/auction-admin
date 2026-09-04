'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useMarketContext } from '@/context/market-context';
import { ApiError, apiClient } from '@/lib/api-client';
import { formatIDR } from '@/lib/utils';
import type { AuctionRegistration, Bid, Product, ProductStatus } from '@/lib/types';

const COLUMN_COUNT = 6;

const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  published: 'Dipublikasikan',
  sold: 'Terjual',
  expired: 'Kedaluwarsa',
};

const PRODUCT_STATUS_FILTERS: Array<{ value: ProductStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Dipublikasikan' },
  { value: 'sold', label: 'Terjual' },
  { value: 'expired', label: 'Kedaluwarsa' },
];

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  if (status === 'draft') {
    return <Badge variant="outline">{PRODUCT_STATUS_LABEL[status]}</Badge>;
  }
  if (status === 'published') {
    return <Badge className="bg-brand-success text-white">{PRODUCT_STATUS_LABEL[status]}</Badge>;
  }
  if (status === 'sold') {
    return <Badge className="bg-brand-info text-white">{PRODUCT_STATUS_LABEL[status]}</Badge>;
  }
  return (
    <Badge variant="outline" className="border-brand-error text-brand-error">
      {PRODUCT_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Tidak ada endpoint untuk resolve nama/email dari user id — tampilkan potongan pendek UUID apa adanya. */
function shortId(id: string | null): string {
  if (!id) return '-';
  return `${id.slice(0, 8)}…`;
}

const REGISTRATION_STATUS_LABEL: Record<AuctionRegistration['status'], string> = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  HELD: 'Deposit Tertahan (HELD)',
  REFUNDED: 'Direfund (Kalah)',
  FORFEITED: 'Forfeit ke Seller (Telat Lunas)',
};

function RegistrationStatusBadge({ status }: { status: AuctionRegistration['status'] }) {
  if (status === 'HELD') {
    return <Badge className="bg-brand-success text-white">{REGISTRATION_STATUS_LABEL[status]}</Badge>;
  }
  if (status === 'REFUNDED') {
    return <Badge className="bg-brand-info text-white">{REGISTRATION_STATUS_LABEL[status]}</Badge>;
  }
  if (status === 'FORFEITED') {
    return (
      <Badge variant="outline" className="border-brand-error text-brand-error">
        {REGISTRATION_STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-brand-warning text-brand-warning">
      {REGISTRATION_STATUS_LABEL[status]}
    </Badge>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatScheduleRange(start: string | null, end: string | null): string {
  if (!start && !end) return '-';
  return `${start ? formatDateTime(start) : '-'} – ${end ? formatDateTime(end) : '-'}`;
}

function LelangDetailRow({ marketId, productId }: { marketId: string; productId: string }) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [registrations, setRegistrations] = useState<AuctionRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient<Bid[]>(`/api/markets/${marketId}/products/${productId}/bids`),
      apiClient<AuctionRegistration[]>(`/api/markets/${marketId}/products/${productId}/registrations`),
    ])
      .then(([bidsData, registrationsData]) => {
        if (!cancelled) {
          setBids(bidsData);
          setRegistrations(registrationsData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : 'Gagal memuat detail lelang.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marketId, productId]);

  return (
    <TableRow>
      <TableCell colSpan={COLUMN_COUNT} className="bg-muted/30 p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat detail lelang…</p>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">Riwayat Bid</p>
              {bids.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada bid untuk produk ini.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Bidder</TableHead>
                      <TableHead>Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid) => (
                      <TableRow key={bid.id}>
                        <TableCell>{formatDateTime(bid.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{shortId(bid.bidder_user_id)}</TableCell>
                        <TableCell>{formatIDR(bid.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Peserta & Status Deposit</p>
              {registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada peserta terdaftar untuk produk ini.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terdaftar</TableHead>
                      <TableHead>Peserta</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell>{formatDateTime(registration.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{shortId(registration.buyer_user_id)}</TableCell>
                        <TableCell>{formatIDR(registration.deposit_amount)}</TableCell>
                        <TableCell>
                          <RegistrationStatusBadge status={registration.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function LelangTable({ marketId }: { marketId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      // Endpoint tidak punya filter mode_jual server-side — filter AUCTION di client.
      const data = await apiClient<Product[]>(`/api/markets/${marketId}/products${query}`);
      setProducts(data.filter((p) => p.mode_jual === 'AUCTION'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat daftar lelang.');
    } finally {
      setLoading(false);
    }
  }, [marketId, statusFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Daftar Lelang</CardTitle>
          <CardDescription>
            Semua produk mode lelang di Market ini. Klik baris untuk lihat riwayat bid & status deposit peserta.
          </CardDescription>
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProductStatus | 'all')}>
          <SelectTrigger className="w-44" aria-label="Filter status produk">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada produk lelang untuk filter ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nama Produk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Bid Tertinggi</TableHead>
                <TableHead>Pemenang</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const isExpanded = expandedId === product.id;
                return (
                  <Fragment key={product.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : product.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <ProductStatusBadge status={product.status} />
                      </TableCell>
                      <TableCell>{formatScheduleRange(product.auction_start_at, product.auction_end_at)}</TableCell>
                      <TableCell>
                        {product.current_highest_bid != null ? formatIDR(product.current_highest_bid) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{shortId(product.highest_bidder_id)}</TableCell>
                    </TableRow>
                    {isExpanded && <LelangDetailRow marketId={marketId} productId={product.id} />}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function LelangPage() {
  const { activeMarket, loading: marketLoading } = useMarketContext();

  if (marketLoading) {
    return <LoadingSpinner label="Memuat…" />;
  }

  if (!activeMarket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Belum ada Market aktif</CardTitle>
          <CardDescription>Buat atau pilih Market dulu di Market Settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <LelangTable marketId={activeMarket.id} />;
}
