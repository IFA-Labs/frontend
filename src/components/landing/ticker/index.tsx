'use client';

import { useState, useEffect } from 'react';
import apiService, { TokenPrice } from '@/lib/api';

interface TickerData {
  symbol: string;
  price: number;
  change7d: number;
  change7dPct: number;
}

export default function CryptoTicker() {
  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const prices = await apiService.getAllTokenPrices();

        const updatedData = prices.map((item) => ({
          symbol: item.symbol,
          price: item.price,
          change7d: item.change_7d || 0,
          change7dPct: item.change_7d_pct || 0,
        }));

        setTickerData(updatedData);
      } catch (error) {
        console.error('Error fetching ticker prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickerData();
    const interval = setInterval(fetchTickerData, 10000);

    return () => clearInterval(interval);
  }, []);

  const tickerItems = [
    ...tickerData,
    ...tickerData,
    ...tickerData,
    ...tickerData,
  ];

  const formatPercentage = (pct: number): string => {
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
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
                  <p className="price">
                    $
                    {item.price.toLocaleString(undefined, {
                      minimumFractionDigits: 5,
                      maximumFractionDigits: 6,
                    })}
                  </p>
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
