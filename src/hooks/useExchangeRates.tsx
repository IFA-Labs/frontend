'use client';
import { useState, useEffect } from 'react';
import apiService from '@/lib/api';

interface ExchangeRateResult {
  rate: number | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useExchangeRate = (
  fromToken: string,
  toToken: string,
): ExchangeRateResult => {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRate = async () => {
    if (fromToken === toToken) {
      setRate(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const exchangeRate = await apiService.getPriceForPair(fromToken, toToken);
      setRate(exchangeRate);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('Unknown error fetching exchange rate'),
      );
      setRate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
  }, [fromToken, toToken]);

  return {
    rate,
    loading,
    error,
    refresh: fetchRate,
  };
};

export default useExchangeRate;
