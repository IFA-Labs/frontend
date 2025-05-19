import { useState, useEffect } from 'react';
import apiService, { TokenPrice } from '@/lib/api';

export const useTokenPrices = (refreshInterval = 5000) => {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const tokenPrices = await apiService.getAllTokenPrices();
        setPrices(tokenPrices);
        setError(null);
      } catch (err) {
        console.error('Error fetching token prices:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Unknown error fetching prices'),
        );
      } finally {
        setLoading(false);
      }
    };


    fetchPrices();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);

  return { prices, loading, error };
};

export default useTokenPrices;
