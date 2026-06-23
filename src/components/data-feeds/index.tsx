'use client';

import Link from 'next/link';
import { StaticImageData } from 'next/image';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import {
  NetworkArbitrumOne,
  NetworkBase,
  NetworkBaseSepolia,
  NetworkBinanceSmartChain,
  NetworkEthereum,
  NetworkMantle,
  NetworkMantleSepolia,
  NetworkPolygon,
  NetworkSui,
} from '@web3icons/react';
import apiService, { OracleFeed } from '@/lib/api';
import { TokenIcon, hasWeb3TokenIcon, hasFiatFlag } from '@/lib/token-icons';
import StartBuilding from '../start-building';
import {
  buildDataFeedRowsFromFeeds,
  DataFeedRow,
  formatFeedPrice,
  getFeedBadgeLabel,
} from '@/lib/data-feeds';
import { ChevronDown } from '../svg';

const networkIconLabels: Record<string, string> = {
  'Arbitrum Mainnet': 'A',
  'BNB Chain Mainnet': 'BNB',
  'Ethereum Mainnet': 'E',
  'Polygon Mainnet': 'P',
  'Base Mainnet': 'B',
};

const categoryIconLabels: Record<string, string> = {
  Crypto: '₿',
  Fiat: '💱',
  Stablecoin: '$',
  'Newly launched': '✨',
  'SVR-enabled': '🔐',
  Ngn: '🇳🇬',
  Brl: '🇧🇷',
  Eur: '🇪🇺',
  Gbp: '🇬🇧',
  Ghs: '🇬🇭',
  Kes: '🇰🇪',
  Zar: '🇿🇦',
};

const pageFeedOrder = [
  'BTC',
  'ETHBTC',
  'ETH',
  'BNB',
  'POL',
  'ARB',
  'USDC',
  'USDT',
  'CNGN',
  'BRZ',
  'ZARP',
];

type Web3NetworkIcon = ComponentType<{
  className?: string;
  size?: number | string;
  variant?: 'branded' | 'mono' | 'background';
}>;

const networkIconComponents: Record<string, Web3NetworkIcon> = {
  '1': NetworkEthereum,
  '56': NetworkBinanceSmartChain,
  '137': NetworkPolygon,
  '42161': NetworkArbitrumOne,
  '5000': NetworkMantle,
  '5003': NetworkMantleSepolia,
  '8453': NetworkBase,
  '84532': NetworkBaseSepolia,
  '1282977196': NetworkSui,
};

const DataFeeds = () => {
  const [apiFeeds, setApiFeeds] = useState<OracleFeed[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [networkFilter, setNetworkFilter] = useState('All Networks');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  useEffect(() => {
    let isMounted = true;

    const fetchFeeds = async () => {
      try {
        const feeds = await apiService.getFeeds();
        if (isMounted) {
          setApiFeeds(feeds);
        }
      } catch (error) {
        if (isMounted) {
          setApiFeeds([]);
        }
      } finally {
        if (isMounted) {
          setFeedsLoading(false);
        }
      }
    };

    fetchFeeds();

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = buildDataFeedRowsFromFeeds(apiFeeds);
  const availableNetworks = [...new Set(rows.map((row) => row.network))];
  const networks = ['All Networks', ...availableNetworks];
  const networkRows = new Map(
    rows.map((row) => [row.network, row] as [string, DataFeedRow]),
  );
  const availableCategories = [
    ...new Set(rows.flatMap((row) => row.categories)),
  ];
  const categories = ['All Categories', ...availableCategories];
  const isLoading = feedsLoading && rows.length === 0;

  const filteredRows = rows
    .filter((row) => {
      const matchesNetwork =
        networkFilter === 'All Networks' || row.network === networkFilter;
      const matchesCategory =
        categoryFilter === 'All Categories' ||
        row.categories.includes(categoryFilter);

      return matchesNetwork && matchesCategory;
    })
    .sort((a, b) => {
      const aIndex = pageFeedOrder.indexOf(a.baseSymbol);
      const bIndex = pageFeedOrder.indexOf(b.baseSymbol);

      if (aIndex === -1 && bIndex === -1) {
        return a.symbol.localeCompare(b.symbol);
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  const renderFeedIcon = (
    feedSymbol: string,
    icon?: string | StaticImageData,
  ) => {
    // feedSymbol is the pair e.g. "BRL/USD" or "ETH / BTC"; use the base token.
    const base = feedSymbol.split('/')[0]?.trim() || feedSymbol;

    if (hasWeb3TokenIcon(base) || hasFiatFlag(base) || icon) {
      return <TokenIcon symbol={base} icon={icon} size={20} />;
    }

    return <span className="feed-fallback-icon">{getFeedBadgeLabel(base)}</span>;
  };

  const renderFilterIcon = (label: string) => (
    <span className="filter-icon">
      {networkIconLabels[label] ||
        categoryIconLabels[label] ||
        label.slice(0, 2)}
    </span>
  );

  const renderNetworkIcon = (row: DataFeedRow) => {
    if (row.chainId === '42420') {
      return (
        <img
          src="/images/networks/Asset Chain.png"
          alt={row.network}
          width={16}
          height={16}
        />
      );
    }

    const NetworkIcon = row.chainId
      ? networkIconComponents[row.chainId]
      : undefined;

    if (NetworkIcon) {
      return (
        <NetworkIcon
          className="network-web3-icon"
          size={16}
          variant="branded"
        />
      );
    }

    if (row.chainLogoUrl) {
      return (
        <img src={row.chainLogoUrl} alt={row.network} width={16} height={16} />
      );
    }

    return renderFilterIcon(row.network);
  };

  const formatAnswer = (prefix: string, price: number) =>
    `${prefix}${formatFeedPrice(price)}`;

  return (
    <section className="data-feeds-page">
      <div className="data-feeds-shell">
        <div className="data-feeds-heading">
          <h1>Data Feeds</h1>
          <p>
            Highly secure, reliable and decentralized real-world data published
            onchain.
          </p>
        </div>

        <div className="data-feeds-controls">
          <label className="filter-select">
            <span className="select-value">
              {networkFilter}
              <small>{networks.length - 1}</small>
            </span>
            <select
              aria-label="Filter by network"
              value={networkFilter}
              onChange={(event) => setNetworkFilter(event.target.value)}
            >
              {networks.map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
            <span className="select-chevron">
              <ChevronDown />
            </span>
          </label>

          <label className="filter-select">
            <span className="select-value">
              {categoryFilter}
              <small>{categories.length - 1}</small>
            </span>
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <span className="select-chevron">
              <ChevronDown />
            </span>
          </label>
        </div>

        <div className="filter-pills">
          {availableNetworks.map((network) => (
            <button
              key={network}
              className={networkFilter === network ? 'active' : ''}
              onClick={() => setNetworkFilter(network)}
              type="button"
            >
              {networkRows.get(network)
                ? renderNetworkIcon(networkRows.get(network) as DataFeedRow)
                : renderFilterIcon(network)}
              {network}
            </button>
          ))}

          {availableCategories.map((category) => (
            <button
              key={category}
              className={categoryFilter === category ? 'active' : ''}
              onClick={() => setCategoryFilter(category)}
              type="button"
            >
              {renderFilterIcon(category)}
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
            {isLoading
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
                  return (
                    <div className="feed-row" key={row.feedId}>
                      <div className="feed-cell feed-cell-primary">
                        <span className="feed-cell-label">Feed</span>
                        <div className="feed-identity">
                          {renderFeedIcon(row.symbol, row.icon)}
                          <strong>{row.symbol}</strong>
                          {row.svrEnabled && (
                            <span className="svr-pill">SVR</span>
                          )}
                        </div>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Network</span>
                        <span className="network-value">
                          {renderNetworkIcon(row)}
                          {row.network}
                        </span>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Answer</span>
                        <div>{formatAnswer(row.answerPrefix, row.price)}</div>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">
                          Deviation Threshold
                        </span>
                        <span>{row.deviationThreshold}</span>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Heartbeat</span>
                        <span>{row.heartbeat}</span>
                      </div>

                      <div className="feed-cell">
                        <span className="feed-cell-label">Asset Class</span>
                        <span className="asset-class-value">
                          {renderFilterIcon(row.assetClass)}
                          {row.assetClass}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      <div className="request-data-field-banner">
        <p>Do you need a new data field</p>
        <Link href="/request-data-field" className="request-data-field-cta">
          Request new data Field
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <StartBuilding />
    </section>
  );
};

export default DataFeeds;
