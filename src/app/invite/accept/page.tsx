'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Mail, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, apiClient } from '@/lib/api-client';

type AcceptState = 'idle' | 'loading' | 'success' | 'error' | 'login-required';

interface AcceptResult {
  market_id?: string;
  role?: string;
}

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { isLoggedIn, loading: authLoading, user } = useAuth();

  const [state, setState] = useState<AcceptState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AcceptResult | null>(null);

  const acceptInvitation = useCallback(async () => {
    if (!token) {
      setState('error');
      setError('Token undangan tidak ditemukan. Periksa link dari email Anda.');
      return;
    }

    setState('loading');
    setError('');

    try {
      const data = await apiClient<AcceptResult>(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });
      setResult(data);
      setState('success');

      if (typeof localStorage !== 'undefined' && data.market_id) {
        localStorage.setItem('am_active_market', data.market_id);
      }

      setTimeout(() => router.replace('/dashboard'), 2500);
    } catch (err) {
      setState('error');
      setError(err instanceof ApiError ? err.message : 'Gagal menerima undangan. Silakan coba lagi.');
    }
  }, [token, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setState('error');
      setError('Token undangan tidak ditemukan. Periksa link dari email Anda.');
      return;
    }

    if (!isLoggedIn) {
      setState('login-required');
      return;
    }

    if (state === 'idle') {
      void acceptInvitation();
    }
  }, [authLoading, isLoggedIn, token, state, acceptInvitation]);

  const loginHref = `/auth/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md overflow-hidden py-0">
        <div className="bg-brand-primary px-6 py-8 text-center text-white">
          <Mail className="mx-auto h-8 w-8" />
          <h1 className="mt-3 text-xl font-bold">Undangan Staff Market</h1>
          <p className="mt-1 text-sm text-white/80">Bagdja Auction Market</p>
        </div>

        <CardContent className="space-y-4 px-6 py-8">
          {(authLoading || state === 'loading') && (
            <div className="flex flex-col items-center gap-3 py-6">
              <LoadingSpinner />
              <p className="text-sm text-muted-foreground">Memproses undangan…</p>
            </div>
          )}

          {state === 'login-required' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Login dengan akun Bagdja untuk menerima undangan staff Market.
              </p>
              <Button asChild className="w-full">
                <Link href={loginHref}>Login untuk Lanjut</Link>
              </Button>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-brand-success" />
              <div>
                <p className="text-lg font-semibold text-brand-success">Undangan diterima!</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {user?.email ? (
                    <>
                      Anda bergabung dengan akun <strong>{user.email}</strong>
                      {result?.role ? (
                        <>
                          {' '}
                          sebagai <strong className="capitalize">{result.role}</strong>
                        </>
                      ) : null}
                      .
                    </>
                  ) : (
                    'Anda berhasil bergabung ke Market ini.'
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Mengalihkan ke dashboard…</p>
              </div>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/dashboard">Buka Dashboard</Link>
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4 text-center">
              <TriangleAlert className="mx-auto h-12 w-12 text-brand-error" />
              <p className="text-sm text-destructive">{error}</p>
              {isLoggedIn ? (
                <Button variant="secondary" className="w-full" onClick={() => acceptInvitation()}>
                  Coba Lagi
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href={loginHref}>Login</Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">Kembali ke Beranda</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
