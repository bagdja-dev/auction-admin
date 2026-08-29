'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { LoadingSpinner } from '@/components/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

// Internal admin tool — bukan halaman marketing. Cukup redirect ke
// /dashboard kalau sudah login, atau /auth/login kalau belum.
function LandingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, loading } = useAuth();
  const error = searchParams.get('error');

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [loading, isLoggedIn, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <LoadingSpinner label="Mengalihkan…" />
      {error && (
        <p className="max-w-sm text-sm text-destructive">
          Login gagal ({error}). Silakan coba lagi.
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LandingRedirect />
    </Suspense>
  );
}
