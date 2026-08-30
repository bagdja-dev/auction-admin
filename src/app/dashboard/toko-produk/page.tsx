'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useMarketContext } from '@/context/market-context';
import { ApiError, apiClient } from '@/lib/api-client';
import { formatIDR } from '@/lib/utils';
import type { Product, ProductModeJual, ProductStatus, Seller } from '@/lib/types';

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

const MODE_JUAL_LABEL: Record<ProductModeJual, string> = {
  AUCTION: 'Lelang',
  DIRECT_SELL: 'Beli Langsung',
};

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

function ModeJualBadge({ mode }: { mode: ProductModeJual }) {
  return <Badge variant="outline">{MODE_JUAL_LABEL[mode]}</Badge>;
}

function SellerStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Badge className="bg-brand-success text-white">Aktif</Badge>;
  }
  return (
    <Badge variant="outline" className="border-brand-error text-brand-error">
      Nonaktif
    </Badge>
  );
}

function SellersTab({ marketId }: { marketId: string }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Seller[]>(`/api/markets/${marketId}/sellers`);
      setSellers(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat daftar toko.');
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    void loadSellers();
  }, [loadSellers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Toko</CardTitle>
        <CardDescription>Seller yang terdaftar di Market ini.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : sellers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada toko terdaftar di Market ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Toko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bergabung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell>{seller.shop_name ?? '-'}</TableCell>
                  <TableCell>{seller.email ?? '-'}</TableCell>
                  <TableCell>
                    <SellerStatusBadge isActive={seller.is_active} />
                  </TableCell>
                  <TableCell>{new Date(seller.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProductsTab({ marketId }: { marketId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await apiClient<Product[]>(`/api/markets/${marketId}/products${query}`);
      setProducts(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat daftar produk.');
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
          <CardTitle>Daftar Produk</CardTitle>
          <CardDescription>Semua produk dari seluruh toko di Market ini.</CardDescription>
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
          <p className="text-sm text-muted-foreground">Belum ada produk untuk filter ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Mode Jual</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <ModeJualBadge mode={product.mode_jual} />
                  </TableCell>
                  <TableCell>{formatIDR(product.price)}</TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell>{new Date(product.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function TokoProdukPage() {
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sellers">
        <TabsList>
          <TabsTrigger value="sellers">Toko (Seller)</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
        </TabsList>
        <TabsContent value="sellers">
          <SellersTab marketId={activeMarket.id} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab marketId={activeMarket.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
