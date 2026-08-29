'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/number-input';
import { emptyTierRow, validateDepositTiers, type DepositTierRow } from '@/lib/deposit-tier';

interface DepositTierEditorProps {
  rows: DepositTierRow[];
  onChange: (rows: DepositTierRow[]) => void;
}

export function DepositTierEditor({ rows, onChange }: DepositTierEditorProps) {
  const error = validateDepositTiers(rows);

  function updateRow(key: string, field: 'min' | 'max' | 'price', value: string) {
    onChange(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    onChange([...rows, emptyTierRow()]);
  }

  function removeRow(key: string) {
    onChange(rows.filter((r) => r.key !== key));
  }

  return (
    <div className="space-y-2">
      <Label>Config Deposit Tier</Label>
      <p className="text-xs text-muted-foreground">
        Opsional. Nominal deposit yang harus dibayar peserta lelang berdasarkan rentang harga
        produk — dipakai mulai Fase 3 (bidding). Kosongkan Maks pada baris terakhir untuk rentang
        tanpa batas atas.
      </p>

      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 text-xs text-muted-foreground">
          <span>Harga min</span>
          <span>Harga maks</span>
          <span>Deposit</span>
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

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
