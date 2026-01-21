import { usePrices } from '@/contexts/PriceContext';
import { TokenPrice } from '@/lib/api';


export const useTokenPrices = () => {
  const { prices, loading, error } = usePrices();
  return { prices, loading, error };
};

export default useTokenPrices;
