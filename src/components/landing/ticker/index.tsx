'use client';

import { useState, useEffect } from 'react';
import apiService, { TokenPrice } from '@/lib/api';

interface TickerData {
  symbol: string;
  price: number;
  change: number;
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
          change: 0,
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

  return (
    <div className="ticker-wrapper">
      <div className="ticker">
        {loading ? (
          <div className="ticker-item">Loading prices...</div>
        ) : (
          tickerItems.map((item, index) => (
            <div key={index} className="ticker-item">
              <span className="coin-name">
                <p className="symbol">{item.symbol}</p>
                <label htmlFor="">Crypto</label>
              </span>

              <span className="price-wrapper">
                <p className="price">
                  $
                  {item.price.toLocaleString(undefined, {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 9,
                  })}
                </p>
                <p className="change">
                  <span className="up-arrow">▲</span> {item.change}%{' '}
                  <span className="text-[#8C859A]">7D</span>
                </p>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
