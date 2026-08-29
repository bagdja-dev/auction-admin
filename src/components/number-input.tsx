'use client';

import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react';

import { Input } from '@/components/ui/input';

interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Nilai mentah — string digit polos (mis. "1000000"), bukan yang sudah diformat. */
  value: string;
  /** Dipanggil dengan string digit polos (tanpa pemisah ribuan). */
  onChange: (raw: string) => void;
}

/**
 * Input angka dengan mask pemisah ribuan ala Indonesia (mis. "1.000.000")
 * saat mengetik. `type="number"` bawaan browser tidak bisa menampilkan mask
 * (karakter non-digit ditolak), jadi ini pakai `type="text"` + `inputMode`
 * numerik, dengan state yang tetap disimpan sebagai digit polos di caller.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const display = value ? Number(value).toLocaleString('id-ID') : '';

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      onChange(raw);
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

NumberInput.displayName = 'NumberInput';
