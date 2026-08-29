'use client';

import { ChevronDown, Menu } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarketContext } from '@/context/market-context';
import { useAuth } from '@/hooks/use-auth';

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user } = useAuth();
  const { markets, activeMarket, switchMarket, isOwner } = useMarketContext();

  const displayName = user?.username ?? user?.email ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Market switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="max-w-[220px] justify-between gap-2">
              <span className="truncate">
                {activeMarket ? activeMarket.name : 'Pilih Market'}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>
              {isOwner ? 'Semua Market (Owner)' : 'Market Anda'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {markets.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Belum ada Market.
              </div>
            )}
            {markets.map((market) => (
              <DropdownMenuItem
                key={market.id}
                onSelect={() => switchMarket(market.id)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{market.name}</span>
                {activeMarket?.id === market.id && (
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    Aktif
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: profile menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-accent">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              {isOwner && <p className="text-xs text-muted-foreground">Owner</p>}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-primary text-xs text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="font-semibold">{displayName}</p>
            {user?.email && <p className="text-xs font-normal text-muted-foreground">{user.email}</p>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive">
            <a href="/auth/logout">Keluar</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
