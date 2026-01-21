'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePrices } from '@/contexts/PriceContext';
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
}

export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  const { prices, loading, error } = usePrices();

  return (
    <TokenContext.Provider value={{ prices, loading, error }}>
      {children}
    </TokenContext.Provider>
  );
};

export default TokenProvider;
