'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import apiService, { TokenPrice } from '@/lib/api';

interface PriceContextType {
  prices: TokenPrice[];
  loading: boolean;
  error: Error | null;
  refreshPrices: () => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

interface PriceProviderProps {
  children: ReactNode;
  refreshInterval?: number;
}

export function PriceProvider({
  children,
  refreshInterval = 10000,
}: PriceProviderProps) {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = async () => {
    try {
      const tokenPrices = await apiService.getAllTokenPrices();
      setPrices(tokenPrices);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Unknown error fetching prices'),
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    await fetchPrices();
  };

  useEffect(() => {
    fetchPrices();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);

  return (
    <PriceContext.Provider value={{ prices, loading, error, refreshPrices }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices(): PriceContextType {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrices must be used within a PriceProvider');
  }
  return context;
}

export function useTokenPrice(symbol: string) {
  const { prices, loading, error } = usePrices();

  const tokenPrice = prices.find(
    (p) => p.symbol === symbol || p.symbol.startsWith(`${symbol}/`),
  );

  return {
    price: tokenPrice?.price ?? 0,
    change_7d: tokenPrice?.change_7d,
    change_7d_pct: tokenPrice?.change_7d_pct,
    icon: tokenPrice?.icon,
    loading,
    error,
  };
}

export default PriceProvider;
