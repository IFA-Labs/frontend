'use client';

import { useState, useEffect } from 'react';
import { SearchIcon, LockIcon } from '../../svg';
import apiService, { TokenPrice } from '@/lib/api';
import { StaticImageData } from 'next/image';
import Image from 'next/image';

interface CryptoData {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  icon: string | StaticImageData;
}

const CryptoTracker: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const prices = await apiService.getAllTokenPrices();
        const updatedData = prices.map((item) => ({
          symbol: item.symbol,
          price: item.price,
          change: item.change_7d || 0,
          changePct: item.change_7d_pct || 0,
          icon: item.icon,
        })) as CryptoData[];
        const PRIORITIZED = ['CNGN', 'BRZ', 'USDC', 'USDT', 'ETH'];
        updatedData.sort((a, b) => {
          const aSym = (a.symbol || '').toUpperCase();
          const bSym = (b.symbol || '').toUpperCase();
          const aIdx = PRIORITIZED.indexOf(aSym);
          const bIdx = PRIORITIZED.indexOf(bSym);
          if (aIdx !== -1 || bIdx !== -1) {
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          }
          return aSym.localeCompare(bSym);
        });

        setCryptoData(updatedData);
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const intervalId = setInterval(fetchPrices, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const formatPercentage = (pct: number): string => {
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  return (
    <div className="crypto-tracker">
      <div className="price-wrapper">
        <h3>
          <LockIcon />
          Rate by IFÁ LABS
        </h3>
      </div>

      <div className="table-header">
        <div className="column symbol">SYMBOL</div>
        <div className="column price">PRICE</div>
        <div className="column change">7D</div>
      </div>

      {loading ? (
        <div className="crypto-list">
          {[...Array(4)].map((_, index) => (
            <div className="crypto-item skeleton-item" key={index}>
              <div className="column symbol">
                <div className="skeleton skeleton-column symbol-skeleton" />
              </div>
              <div className="column price">
                <div className="skeleton skeleton-column price-skeleton" />
              </div>
              <div className="column change">
                <div className="skeleton skeleton-column change-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="crypto-list">
          {cryptoData.map((crypto, index) => {
            const isPositive = crypto.changePct >= 0;

            return (
              <div className="crypto-item" key={index}>
                <div className="column symbol">
                  <Image
                    src={crypto.icon}
                    alt={crypto.symbol}
                    width={20}
                    height={20}
                    style={{ marginRight: '8px' }}
                  />
                  {crypto.symbol}
                </div>
                <div className="column price">
                  $
                  {crypto.price.toLocaleString(undefined, {
                    minimumFractionDigits: 7,
                    maximumFractionDigits: 7,
                  })}
                </div>
                <div
                  className={`column change ${
                    isPositive ? 'positive' : 'negative'
                  }`}
                >
                  <span className="change-arrow">{isPositive ? '▲' : '▼'}</span>
                  {formatPercentage(crypto.changePct)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CryptoTracker;
