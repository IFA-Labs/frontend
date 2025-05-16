'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import useTokenPrices from '@/hooks/useTokenPrices';
import { TokenPrice } from '@/lib/api';

interface TokenContextType {
  prices: TokenPrice[];
  loading: boolean;
  error: Error | null;
}

const TokenContext = createContext<TokenContextType>({
  prices: [],
  loading: true,
  error: null,
});

export const useTokenContext = () => useContext(TokenContext);

interface TokenProviderProps {
  children: ReactNode;
  refreshInterval?: number;
}

export const TokenProvider: React.FC<TokenProviderProps> = ({
  children,
  refreshInterval = 30000,
}) => {
  const { prices, loading, error } = useTokenPrices(refreshInterval);

  return (
    <TokenContext.Provider value={{ prices, loading, error }}>
      {children}
    </TokenContext.Provider>
  );
};

export default TokenProvider;
