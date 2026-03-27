'use client';

import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';
import { useState } from 'react';
import { usePrices } from '@/contexts/PriceContext';
import {
  buildFeedChartData,
  FeedChartPoint,
  FeedTimeRange,
  formatCompactCurrency,
  formatFeedChange,
  formatFeedPrice,
  getDataFeedBySlug,
  getFeedBadgeLabel,
} from '@/lib/data-feeds';

const ranges: FeedTimeRange[] = ['live', '1h', '1d', '1w', '1m'];

function buildChartPath(points: FeedChartPoint[], width: number, height: number) {
  if (points.length === 0) return '';

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || max || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const normalized = (point.value - min) / spread;
      const y = height - normalized * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildAreaPath(points: FeedChartPoint[], width: number, height: number) {
  if (points.length === 0) return '';

  const linePath = buildChartPath(points, width, height);
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

const DataFeedDetail = ({ slug }: { slug: string }) => {
  const { prices, loading } = usePrices();
  const [activeRange, setActiveRange] = useState<FeedTimeRange>('live');

  const row = getDataFeedBySlug(prices, slug);

  const renderFeedIcon = (
    symbol: string,
    icon?: string | StaticImageData,
  ) => {
    if (icon) {
      return <Image src={icon} alt={symbol} width={28} height={28} />;
    }

    return (
      <span className="feed-detail-fallback-icon">
        {getFeedBadgeLabel(symbol)}
      </span>
    );
  };

  if (!loading && !row) {
    return (
      <section className="data-feed-detail-page">
        <div className="data-feed-detail-shell">
          <Link href="/data-feeds" className="back-link">
            Back to Data Feeds
          </Link>

          <div className="detail-empty-state">
            <h1>Dataset not found</h1>
            <p>The feed you requested is not available in the current dataset.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!row) {
    return (
      <section className="data-feed-detail-page">
        <div className="data-feed-detail-shell">
          <div className="detail-loading-card">Loading dataset…</div>
        </div>
      </section>
    );
  }

  const chartPoints = buildFeedChartData(row, activeRange);
  const linePath = buildChartPath(chartPoints, 100, 100);
  const areaPath = buildAreaPath(chartPoints, 100, 100);
  const values = chartPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const midValue = (minValue + maxValue) / 2;
  const isPositive = row.changePct >= 0;
  const liquidityEstimate = Math.max(row.price, 1) * 850000;
  const coverageEstimate = Math.max(row.price, 1) * 2150000;

  return (
    <section className="data-feed-detail-page">
      <div className="data-feed-detail-shell">
        <Link href="/data-feeds" className="back-link">
          Back to Data Feeds
        </Link>

        <div className="detail-header">
          <div className="detail-title">
            {renderFeedIcon(row.baseSymbol, row.icon)}
            <h1>{row.symbol}</h1>
            <span>{row.feedId}</span>
          </div>
        </div>

        <div className="detail-top-grid">
          <div className="detail-card metadata-card">
            <div className="meta-row">
              <span>Network</span>
              <strong>{row.network}</strong>
            </div>
            <div className="meta-row">
              <span>Trigger parameters</span>
              <strong>{row.deviationThreshold}</strong>
            </div>
            <div className="meta-row">
              <span>Heartbeat</span>
              <strong>{row.heartbeat}</strong>
            </div>
            <div className="detail-tag">{row.assetClass}</div>
          </div>

          <div className="detail-card reference-card">
            <h2>Feed references</h2>
            <div className="meta-row">
              <span>Feed ID</span>
              <strong>{row.feedId}</strong>
            </div>
            <div className="meta-row">
              <span>Oracle route</span>
              <strong>{row.oracleRoute}</strong>
            </div>
            <div className="meta-row">
              <span>Precision</span>
              <strong>{row.precision}</strong>
            </div>
          </div>

          <div className="detail-stat-card">
            <span>Current answer</span>
            <strong>${formatFeedPrice(row.price)}</strong>
          </div>

          <div className="detail-stat-card">
            <span>7D change</span>
            <strong className={isPositive ? 'positive' : 'negative'}>
              {formatFeedChange(row.changePct)}
            </strong>
          </div>

          <div className="detail-stat-card">
            <span>Liquidity estimate</span>
            <strong>{formatCompactCurrency(liquidityEstimate)}</strong>
          </div>

          <div className="detail-stat-card">
            <span>Coverage estimate</span>
            <strong>{formatCompactCurrency(coverageEstimate)}</strong>
          </div>
        </div>

        <div className="detail-chart-shell">
          <div className="range-tabs">
            {ranges.map((range) => (
              <button
                key={range}
                type="button"
                className={activeRange === range ? 'active' : ''}
                onClick={() => setActiveRange(range)}
              >
                {range === 'live' ? 'Live' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-grid">
              {[maxValue, midValue, minValue].map((value) => (
                <div className="chart-grid-line" key={value}>
                  <span>${formatFeedPrice(value)}</span>
                </div>
              ))}
            </div>

            <div className="chart-stage">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="feedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(217, 198, 255, 0.72)" />
                    <stop offset="100%" stopColor="rgba(217, 198, 255, 0.04)" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#feedAreaGradient)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#d9c6ff"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="chart-labels">
              {chartPoints.map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataFeedDetail;
