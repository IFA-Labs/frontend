'use client';

import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';
import { useState } from 'react';
import { usePrices } from '@/contexts/PriceContext';
import {
  buildDataFeedRows,
  formatFeedChange,
  formatFeedPrice,
  getFeedBadgeLabel,
  getFeedSlug,
} from '@/lib/data-feeds';

const DataFeeds = () => {
  const { prices, loading } = usePrices();
  const [networkFilter, setNetworkFilter] = useState('All Networks');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const rows = buildDataFeedRows(prices);
  const networks = ['All Networks', ...new Set(rows.map((row) => row.network))];
  const categories = [
    'All Categories',
    ...new Set(rows.map((row) => row.category)),
  ];

  const filteredRows = rows.filter((row) => {
    const matchesNetwork =
      networkFilter === 'All Networks' || row.network === networkFilter;
    const matchesCategory =
      categoryFilter === 'All Categories' || row.category === categoryFilter;

    return matchesNetwork && matchesCategory;
  });

  const renderFeedIcon = (
    symbol: string,
    icon?: string | StaticImageData,
  ) => {
    if (icon) {
      return <Image src={icon} alt={symbol} width={20} height={20} />;
    }

    return (
      <span className="feed-fallback-icon">{getFeedBadgeLabel(symbol)}</span>
    );
  };

  return (
    <section className="data-feeds-page">
      <div className="data-feeds-shell">
        <div className="data-feeds-heading">
          <div>
            <span className="eyebrow">Oracle Coverage</span>
            <h1>Data Feeds</h1>
            <p>
              Highly secure, reliable and decentralized real-world data
              published onchain.
            </p>
          </div>

          <Link href="https://docs.ifalabs.com" target="_blank" className="docs-link">
            Developer docs
          </Link>
        </div>

        <div className="data-feeds-controls">
          <label className="filter-select">
            <span>Network</span>
            <select
              value={networkFilter}
              onChange={(event) => setNetworkFilter(event.target.value)}
            >
              {networks.map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            <span>Category</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-pills">
          {networks.slice(1).map((network) => (
            <button
              key={network}
              className={networkFilter === network ? 'active' : ''}
              onClick={() => setNetworkFilter(network)}
              type="button"
            >
              {network}
            </button>
          ))}

          {categories.slice(1).map((category) => (
            <button
              key={category}
              className={categoryFilter === category ? 'active' : ''}
              onClick={() => setCategoryFilter(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="data-feeds-table">
          <div className="table-head">
            <div>Feed</div>
            <div>Network</div>
            <div>Answer</div>
            <div>Deviation Threshold</div>
            <div>Heartbeat</div>
            <div>Asset Class</div>
          </div>

          <div className="table-body">
            {loading
              ? [...Array(8)].map((_, index) => (
                  <div className="feed-row skeleton-row" key={index}>
                    <div className="skeleton-box" />
                    <div className="skeleton-box" />
                    <div className="skeleton-box" />
                    <div className="skeleton-box" />
                    <div className="skeleton-box" />
                    <div className="skeleton-box" />
                  </div>
                ))
              : filteredRows.map((row) => {
                  const isPositive = row.changePct >= 0;

                  return (
                    <Link
                      href={`/data-feeds/${getFeedSlug(row.baseSymbol)}`}
                      className="feed-row"
                      key={row.baseSymbol}
                    >
                      <div className="feed-cell feed-cell-primary">
                        <span className="feed-cell-label">Feed</span>
                        <div className="feed-identity">
                          {renderFeedIcon(row.baseSymbol, row.icon)}
                          <div className="feed-identity-copy">
                            <strong>{row.symbol}</strong>
                            <span
                              className={`trend-pill ${
                                isPositive ? 'positive' : 'negative'
                              }`}
                            >
                              {formatFeedChange(row.changePct)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Network</span>
                        <span>{row.network}</span>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Answer</span>
                        <strong>${formatFeedPrice(row.price)}</strong>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Deviation Threshold</span>
                        <span>{row.deviationThreshold}</span>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Heartbeat</span>
                        <span>{row.heartbeat}</span>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Asset Class</span>
                        <span className="asset-class-pill">{row.assetClass}</span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataFeeds;
