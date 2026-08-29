'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiClient } from '@/lib/api-client';
import type { Market, MarketsResponse } from '@/lib/types';

const ACTIVE_MARKET_STORAGE_KEY = 'am_active_market';

interface MarketContextValue {
  markets: Market[];
  activeMarket: Market | null;
  marketId: string | null;
  isOwner: boolean;
  loading: boolean;
  switchMarket: (marketId: string) => void;
  refresh: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiClient<MarketsResponse>('/api/markets');
      setMarkets(data.markets);
      setIsOwner(data.isOwner);

      const savedId =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(ACTIVE_MARKET_STORAGE_KEY)
          : null;
      const found = data.markets.find((m) => m.id === savedId);
      setActiveMarket(found ?? data.markets[0] ?? null);
    } catch {
      setMarkets([]);
      setIsOwner(false);
      setActiveMarket(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchMarket = useCallback(
    (marketId: string) => {
      const found = markets.find((m) => m.id === marketId);
      if (found) {
        setActiveMarket(found);
        localStorage.setItem(ACTIVE_MARKET_STORAGE_KEY, marketId);
      }
    },
    [markets],
  );

  const value = useMemo(
    () => ({
      markets,
      activeMarket,
      marketId: activeMarket?.id ?? null,
      isOwner,
      loading,
      switchMarket,
      refresh,
    }),
    [markets, activeMarket, isOwner, loading, switchMarket, refresh],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarketContext() {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error('useMarketContext must be used within MarketProvider');
  }
  return ctx;
}
