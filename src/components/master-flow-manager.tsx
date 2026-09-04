'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumberInput } from '@/components/number-input';
import { ApiError, apiClient } from '@/lib/api-client';
import type {
  MasterFlowFormField,
  MasterFlowFormFieldType,
  MasterFlowStep,
  MasterFlowStepPayload,
} from '@/lib/types';

/**
 * Manajer "Master Flow" — Fase 5, SATU flow berlaku untuk SEMUA produk di
 * Market ini (bukan banyak flow per-tenant seperti Website Builder), flat
 * table `master_flow_steps` via API (`GET`/`PUT .../master-flow-steps`).
 * Pola UI PERSIS `DepositTierManager` (tambah/hapus baris + tombol simpan
 * sendiri, terpisah dari form Market utama) — di sini ditambah SATU level
 * "dynamic list" bersarang untuk `form_schema` per step.
 *
 * Step TANPA "Persen Rilis" murni informasi (mis. "Pesanan Dikonfirmasi") —
 * tidak ada uang, tidak perlu approval buyer. Step BER-"Persen Rilis" WAJIB
 * isi "Masa Garansi" (dasar hitung deadline approval/auto-release).
 */
const FIELD_TYPE_OPTIONS: Array<{ value: MasterFlowFormFieldType; label: string }> = [
  { value: 'text', label: 'Teks Singkat' },
  { value: 'textarea', label: 'Teks Panjang' },
  { value: 'number', label: 'Angka' },
  { value: 'image_url', label: 'Foto (URL)' },
];

interface FormFieldRow {
  key: string;
  fieldKey: string;
  label: string;
  type: MasterFlowFormFieldType;
  required: boolean;
}

interface StepRow {
  key: string;
  statusName: string;
  description: string;
  processDay: string;
  releasePercentage: string;
  guarantyDays: string;
  formFields: FormFieldRow[];
}

function emptyFormField(): FormFieldRow {
  return { key: crypto.randomUUID(), fieldKey: '', label: '', type: 'text', required: true };
}

function emptyStep(): StepRow {
  return {
    key: crypto.randomUUID(),
    statusName: '',
    description: '',
    processDay: '',
    releasePercentage: '',
    guarantyDays: '',
    formFields: [],
  };
}

function formFieldToRow(field: MasterFlowFormField): FormFieldRow {
  return { key: crypto.randomUUID(), fieldKey: field.key, label: field.label, type: field.type, required: field.required };
}

function stepToRow(step: MasterFlowStep): StepRow {
  return {
    key: step.id,
    statusName: step.status_name,
    description: step.description ?? '',
    processDay: step.process_day != null ? String(step.process_day) : '',
    releasePercentage: step.release_percentage != null ? String(step.release_percentage) : '',
    guarantyDays: step.guaranty_days != null ? String(step.guaranty_days) : '',
    formFields: (step.form_schema ?? []).map(formFieldToRow),
  };
}

/** Validasi client-side sebelum submit — backend tetap validasi ulang total persen & guaranty_days wajib. */
function validateSteps(rows: StepRow[]): string | null {
  const filled = rows.filter((r) => r.statusName.trim() !== '');
  let totalPercentage = 0;

  for (const row of filled) {
    const label = `Step "${row.statusName}"`;

    if (row.releasePercentage.trim() !== '') {
      const pct = Number(row.releasePercentage);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return `${label}: Persen Rilis harus angka 0-100.`;
      }
      if (row.guarantyDays.trim() === '') {
        return `${label}: Masa Garansi wajib diisi kalau Persen Rilis diisi.`;
      }
      totalPercentage += pct;
    }

    if (row.guarantyDays.trim() !== '') {
      const days = Number(row.guarantyDays);
      if (!Number.isFinite(days) || days <= 0) {
        return `${label}: Masa Garansi harus angka > 0.`;
      }
    }

    for (const field of row.formFields) {
      if (field.fieldKey.trim() === '' || field.label.trim() === '') {
        return `${label}: setiap field form wajib isi Key dan Label.`;
      }
    }
  }

  if (totalPercentage > 100) {
    return `Total Persen Rilis seluruh step (${totalPercentage}%) tidak boleh melebihi 100%.`;
  }

  return null;
}

export function MasterFlowManager({ marketId }: { marketId: string }) {
  const [rows, setRows] = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<MasterFlowStep[]>(`/api/markets/${marketId}/master-flow-steps`);
      setRows(data.map(stepToRow));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat Master Flow.');
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateStep<K extends keyof Omit<StepRow, 'key' | 'formFields'>>(key: string, field: K, value: StepRow[K]) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addStep() {
    setRows((prev) => [...prev, emptyStep()]);
  }

  function removeStep(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addFormField(stepKey: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === stepKey ? { ...r, formFields: [...r.formFields, emptyFormField()] } : r)),
    );
  }

  function removeFormField(stepKey: string, fieldKey: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === stepKey ? { ...r, formFields: r.formFields.filter((f) => f.key !== fieldKey) } : r,
      ),
    );
  }

  function updateFormField<K extends keyof Omit<FormFieldRow, 'key'>>(
    stepKey: string,
    fieldKey: string,
    field: K,
    value: FormFieldRow[K],
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === stepKey
          ? { ...r, formFields: r.formFields.map((f) => (f.key === fieldKey ? { ...f, [field]: value } : f)) }
          : r,
      ),
    );
  }

  const clientError = validateSteps(rows);

  async function handleSave() {
    const error = validateSteps(rows);
    if (error) {
      toast.error(error);
      return;
    }

    const filled = rows.filter((r) => r.statusName.trim() !== '');
    const payload: MasterFlowStepPayload[] = filled.map((r) => ({
      status_name: r.statusName.trim(),
      description: r.description.trim() || null,
      process_day: r.processDay.trim() === '' ? null : Number(r.processDay),
      release_percentage: r.releasePercentage.trim() === '' ? null : Number(r.releasePercentage),
      guaranty_days: r.guarantyDays.trim() === '' ? null : Number(r.guarantyDays),
      form_schema:
        r.formFields.length === 0
          ? null
          : r.formFields.map((f) => ({
              key: f.fieldKey.trim(),
              label: f.label.trim(),
              type: f.type,
              required: f.required,
            })),
    }));

    setSaving(true);
    try {
      const data = await apiClient<MasterFlowStep[]>(`/api/markets/${marketId}/master-flow-steps`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setRows(data.map(stepToRow));
      toast.success('Master Flow berhasil disimpan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan Master Flow.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Master Flow</CardTitle>
        <CardDescription>
          Tahapan fulfillment yang berlaku untuk <strong>semua produk</strong> di Market ini. Step
          tanpa &ldquo;Persen Rilis&rdquo; murni informasi (tidak ada dana dirilis). Step ber-&ldquo;Persen
          Rilis&rdquo; wajib isi &ldquo;Masa Garansi&rdquo; — kalau buyer tidak setujui dalam masa itu,
          dana otomatis dirilis. Kosongkan semua step untuk membiarkan buyer langsung bisa
          &ldquo;Konfirmasi Terima Barang&rdquo; tanpa tahapan apa pun.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat Master Flow…</p>
        ) : (
          <>
            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={row.key} className="space-y-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeStep(row.key)}
                      aria-label="Hapus step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nama Step</Label>
                      <Input
                        value={row.statusName}
                        onChange={(e) => updateStep(row.key, 'statusName', e.target.value)}
                        placeholder="Barang Dikirim"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Estimasi Hari (informasi saja)</Label>
                      <NumberInput
                        value={row.processDay}
                        onChange={(raw) => updateStep(row.key, 'processDay', raw)}
                        placeholder="Opsional"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Deskripsi</Label>
                    <Textarea
                      value={row.description}
                      onChange={(e) => updateStep(row.key, 'description', e.target.value)}
                      placeholder="Opsional — dijelaskan ke buyer/seller"
                      rows={2}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Persen Rilis (%)</Label>
                      <NumberInput
                        value={row.releasePercentage}
                        onChange={(raw) => updateStep(row.key, 'releasePercentage', raw)}
                        placeholder="Kosongkan = step informasi saja"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Masa Garansi (hari)</Label>
                      <NumberInput
                        value={row.guarantyDays}
                        onChange={(raw) => updateStep(row.key, 'guarantyDays', raw)}
                        placeholder="Wajib kalau Persen Rilis diisi"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Form Wajib Diisi Seller (opsional)
                    </Label>
                    {row.formFields.map((field) => (
                      <div key={field.key} className="grid grid-cols-[1fr_1fr_0.8fr_auto_auto] items-center gap-2">
                        <Input
                          value={field.fieldKey}
                          onChange={(e) => updateFormField(row.key, field.key, 'fieldKey', e.target.value)}
                          placeholder="key (mis. resi)"
                        />
                        <Input
                          value={field.label}
                          onChange={(e) => updateFormField(row.key, field.key, 'label', e.target.value)}
                          placeholder="Label (mis. Nomor Resi)"
                        />
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateFormField(row.key, field.key, 'type', value as MasterFlowFormFieldType)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={field.required}
                            onChange={(e) => updateFormField(row.key, field.key, 'required', e.target.checked)}
                          />
                          Wajib
                        </label>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFormField(row.key, field.key)}
                          aria-label="Hapus field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={() => addFormField(row.key)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Tambah Field Form
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" size="sm" variant="outline" onClick={addStep}>
              <Plus className="mr-1 h-4 w-4" />
              Tambah Step
            </Button>

            {clientError && <p className="text-xs font-medium text-destructive">{clientError}</p>}

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={handleSave} disabled={saving || !!clientError}>
                {saving ? 'Menyimpan…' : 'Simpan Master Flow'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
