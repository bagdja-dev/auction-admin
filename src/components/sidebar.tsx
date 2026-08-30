'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ChevronLeft, ChevronRight, Gavel, Landmark, Settings, Store, Users, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMarketContext } from '@/context/market-context';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Mode ringkas (icon-only) — hanya berlaku di layar besar (lg+), drawer mobile selalu penuh. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const NAV_ITEMS = [
  { href: '/dashboard/market-settings', label: 'Market Settings', icon: Settings, ownerOnly: false },
  { href: '/dashboard/toko-produk', label: 'Toko & Produk', icon: Store, ownerOnly: false },
  { href: '/dashboard/lelang', label: 'Lelang & Transaksi', icon: Landmark, ownerOnly: false },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, ownerOnly: true },
];

/**
 * Panel antrian BullMQ (Bull Board) — dijalankan `bagdja-auction-api` sendiri
 * di `/admin/queues` (dilindungi Basic Auth, reuse kredensial SWAGGER_USER/
 * PASSWORD, lihat `main.ts`), BUKAN halaman Next.js — link eksternal biasa.
 * Owner-only karena ini alat ops internal (retry/lihat/hapus job scheduler
 * penutup lelang), bukan bagian workflow harian Staff.
 */
const QUEUES_PANEL_URL = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/admin/queues`;

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { isOwner } = useMarketContext();

  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 lg:transition-[width]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-16',
        )}
      >
        <div className={cn('flex h-16 items-center px-4', collapsed ? 'lg:justify-center lg:px-0' : 'justify-between')}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white">
              <Gavel className="h-4 w-4" />
            </div>
            <span className={cn('text-sm font-bold tracking-tight', collapsed && 'lg:hidden')}>
              Auction Market
            </span>
          </div>
          <button
            onClick={onClose}
            className={cn('rounded-lg p-1.5 hover:bg-sidebar-accent lg:hidden', collapsed && 'lg:hidden')}
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'lg:justify-center lg:px-2',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {isOwner && (
          <div className="border-t border-sidebar-border px-3 py-3">
            <a
              href={QUEUES_PANEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? 'Panel Antrian (BullMQ)' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'lg:justify-center lg:px-2',
              )}
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span className={cn(collapsed && 'lg:hidden')}>Panel Antrian (BullMQ)</span>
            </a>
          </div>
        )}

        {/* Toggle collapse — cuma relevan di layar besar, drawer mobile selalu full-width */}
        <div className="hidden border-t border-sidebar-border p-3 lg:block">
          <button
            onClick={onToggleCollapsed}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-2',
            )}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
            {!collapsed && 'Ciutkan'}
          </button>
        </div>
      </aside>
    </>
  );
}
