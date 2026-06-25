'use client';

import { useState, useEffect } from 'react';
import { usePrices } from '@/contexts/PriceContext';

interface TickerData {
  symbol: string;
  price: number;
  change7d: number;
  change7dPct: number;
}

export default function CryptoTicker() {
  const { prices, loading } = usePrices();
  const [tickerData, setTickerData] = useState<TickerData[]>([]);

  useEffect(() => {
    if (prices.length > 0) {
      const updatedData = prices
        // Drop assets the backend has no price for; otherwise they render as
        // a misleading "$0.00000" in the ticker.
        .filter((item) => item.price > 0)
        .map((item) => ({
          symbol: item.symbol,
          price: item.price,
          change7d: item.change_7d || 0,
          change7dPct: item.change_7d_pct || 0,
        }));
      setTickerData(updatedData);
    }
  }, [prices]);

  const tickerItems = [
    ...tickerData,
    ...tickerData,
    ...tickerData,
    ...tickerData,
  ];

  const formatPercentage = (pct: number): string => {
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  // Adapt precision to magnitude so large prices don't read as "$1,588.138824"
  // and sub-cent prices keep enough significant digits.
  const formatPrice = (price: number): string => {
    const fractionDigits = price >= 1 ? 2 : price >= 0.01 ? 4 : 6;
    return price.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  return (
    <div className="ticker-wrapper">
      <div className="ticker">
        {loading ? (
          <div className="ticker-item">Loading prices...</div>
        ) : (
          tickerItems.map((item, index) => {
            const isPositive7d = item.change7dPct >= 0;

            return (
              <div key={index} className="ticker-item">
                <span className="coin-name">
                  <p className="symbol">{item.symbol}</p>
                  <label htmlFor="">Crypto</label>
                </span>

                <span className="price-wrapper">
                  <p className="price">${formatPrice(item.price)}</p>
                  <p
                    className={`change ${
                      isPositive7d ? 'positive' : 'negative'
                    }`}
                  >
                    <span className={isPositive7d ? 'up-arrow' : 'down-arrow'}>
                      {isPositive7d ? '▲' : '▼'}
                    </span>
                    {formatPercentage(item.change7dPct)}{' '}
                    <span className="text-[#8C859A]">7D</span>
                  </p>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
