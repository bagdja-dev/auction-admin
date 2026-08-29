'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/loading-spinner';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { MarketProvider } from '@/context/market-context';
import { useAuth } from '@/hooks/use-auth';

function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace('/auth/login?next=/dashboard');
    }
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) {
    return <LoadingSpinner label="Memeriksa sesi login…" />;
  }

  return <>{children}</>;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'am_sidebar_collapsed';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1');
    } catch {
      // localStorage bisa dibatasi (private mode dll) — biarkan default expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <AuthGuard>
      <MarketProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </MarketProvider>
    </AuthGuard>
  );
}
