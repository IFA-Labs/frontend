'use client';

import Link from 'next/link';

import { useState } from 'react';
import { usePrices } from '@/contexts/PriceContext';
import { ArrowRightIcon, SearchIcon } from '@/components/svg';
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
  const [searchQuery, setSearchQuery] = useState('');
  const allRows = getHomeFeedRows(prices);
  const cryptoData = searchQuery.trim()
    ? allRows.filter((row) =>
        row.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.baseSymbol.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allRows;

  const renderFeedIcon = (symbol: string, icon?: string | StaticImageData) => {
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

    return (
      <span className="fallback-feed-icon">{getFeedBadgeLabel(symbol)}</span>
    );
  };

  return (
    <div className="crypto-tracker">
      <div className="tracker-topbar">
        <div className="search-container">
          <div className="search-icon">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Link href="/data-feeds" className="view-all-feeds">
          View all
          <ArrowRightIcon />
        </Link>
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
          {cryptoData.length === 0 ? (
            <div className="tracker-empty-state">
              <p>Data feed not available</p>
              <Link href="/request-data-field" className="tracker-request-cta">
                Send a request
                <ArrowRightIcon />
              </Link>
            </div>
          ) : (
            cryptoData.map((crypto, index) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CryptoTracker;
