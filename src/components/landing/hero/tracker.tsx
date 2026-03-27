'use client';

import Link from 'next/link';
import { LockIcon } from '../../svg';
import { usePrices } from '@/contexts/PriceContext';
import { StaticImageData } from 'next/image';
import Image from 'next/image';
import {
  formatFeedChange,
  formatFeedPrice,
  getFeedBadgeLabel,
  getHomeFeedRows,
} from '@/lib/data-feeds';

const CryptoTracker: React.FC = () => {
  const { prices, loading } = usePrices();
  const cryptoData = getHomeFeedRows(prices);

  const renderFeedIcon = (
    symbol: string,
    icon?: string | StaticImageData,
  ) => {
    if (icon) {
      return (
        <Image
          src={icon}
          alt={symbol}
          width={20}
          height={20}
          style={{ marginRight: '8px' }}
        />
      );
    }

    return <span className="fallback-feed-icon">{getFeedBadgeLabel(symbol)}</span>;
  };

  return (
    <div className="crypto-tracker">
      <div className="tracker-topbar">
        <div className="price-wrapper">
          <h3>
            <LockIcon />
            Rate by IFÁ LABS
          </h3>
        </div>
      </div>

      <div className="table-header">
        <div className="column symbol">SYMBOL</div>
        <div className="column price">PRICE</div>
        <div className="column change">7D</div>
      </div>

      {loading ? (
        <div className="crypto-list">
          {[...Array(6)].map((_, index) => (
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
                  {renderFeedIcon(crypto.baseSymbol, crypto.icon)}
                  {crypto.symbol}
                </div>
                <div className="column price">
                  ${formatFeedPrice(crypto.price)}
                </div>
                <div
                  className={`column change ${
                    isPositive ? 'positive' : 'negative'
                  }`}
                >
                  <span className="change-arrow">{isPositive ? '▲' : '▼'}</span>
                  {formatFeedChange(crypto.changePct)}
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
