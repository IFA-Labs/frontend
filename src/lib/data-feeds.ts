import { StaticImageData } from 'next/image';
import { OracleFeed, TokenPrice } from '@/lib/api';
import { tokenList } from '@/lib/tokens';

export interface FeedDefinition {
  baseSymbol: string;
  symbol?: string;
  network: string;
  assetClass: string;
  category: 'Stablecoin' | 'Crypto' | 'Fiat' | 'Newly launched' | 'SVR-enabled';
  deviationThreshold: string;
  heartbeat: string;
  answerPrefix?: string;
  seedPrice?: number;
  feedId?: string;
  oracleRoute?: string;
  precision?: string;
  icon?: string | StaticImageData;
}

export interface DataFeedRow {
  baseSymbol: string;
  symbol: string;
  price: number;
  changePct: number;
  network: string;
  assetClass: string;
  category: FeedDefinition['category'];
  deviationThreshold: string;
  heartbeat: string;
  answerPrefix: string;
  feedId: string;
  oracleRoute: string;
  precision: string;
  assetId?: string;
  chainId?: string;
  chainLogoUrl?: string;
  lastUpdated?: string;
  categories: string[];
  svrEnabled?: boolean;
  icon?: string | StaticImageData;
}

export type FeedTimeRange = 'live' | '1h' | '1d' | '1w' | '1m';

export interface FeedChartPoint {
  label: string;
  value: number;
}

export const HOME_FEED_PRIORITY = [
  'CNGN',
  'BRZ',
  'ZARP',
  'USDC',
  'SUI',
  'USDSUI',
] as const;
export const HOME_FEED_LIMIT = 6;

const FEED_DEFINITIONS: Record<string, FeedDefinition> = {
  BTC: {
    baseSymbol: 'BTC',
    symbol: 'BTC/USD',
    network: 'Ethereum Mainnet',
    assetClass: 'Crypto',
    category: 'SVR-enabled',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 94066.62,
    feedId: 'BTC-USD-Ethereum-SVR-001',
    oracleRoute: 'BTC/USD reference price',
    precision: '8 decimals',
  },
  ETHBTC: {
    baseSymbol: 'ETHBTC',
    symbol: 'ETH / BTC',
    network: 'Ethereum Mainnet',
    assetClass: 'Crypto',
    category: 'Crypto',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '₿',
    seedPrice: 0.02405614,
    feedId: 'ETH-BTC-Ethereum-001',
    oracleRoute: 'ETH/BTC reference price',
    precision: '8 decimals',
    icon: '/images/icons/eth.svg',
  },
  ARB: {
    baseSymbol: 'ARB',
    symbol: 'ARB/USD',
    network: 'Arbitrum Mainnet',
    assetClass: 'Crypto',
    category: 'Newly launched',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.42,
    feedId: 'ARB-USD-Arbitrum-001',
    oracleRoute: 'ARB/USD reference price',
    precision: '8 decimals',
  },
  BNB: {
    baseSymbol: 'BNB',
    symbol: 'BNB/USD',
    network: 'BNB Chain Mainnet',
    assetClass: 'Crypto',
    category: 'Crypto',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 602.18,
    feedId: 'BNB-USD-BNB-001',
    oracleRoute: 'BNB/USD reference price',
    precision: '8 decimals',
  },
  POL: {
    baseSymbol: 'POL',
    symbol: 'POL/USD',
    network: 'Polygon Mainnet',
    assetClass: 'Crypto',
    category: 'Crypto',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.22,
    feedId: 'POL-USD-Polygon-001',
    oracleRoute: 'POL/USD reference price',
    precision: '8 decimals',
  },
  CNGN: {
    baseSymbol: 'CNGN',
    symbol: 'CNGN/USD',
    network: 'Base Mainnet',
    assetClass: 'Fiat',
    category: 'Fiat',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.00065,
    feedId: 'CNGN-USD-Base-001',
    oracleRoute: 'NGN/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/cngn.svg',
  },
  BRZ: {
    baseSymbol: 'BRZ',
    symbol: 'BRZ/USD',
    network: 'Base Mainnet',
    assetClass: 'Fiat',
    category: 'Fiat',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.18,
    feedId: 'BRZ-USD-Base-001',
    oracleRoute: 'BRL/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/BRZ.svg',
  },
  ZARP: {
    baseSymbol: 'ZARP',
    symbol: 'ZARP/USD',
    network: 'Base Mainnet',
    assetClass: 'Fiat',
    category: 'Fiat',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.054,
    feedId: 'ZARP-USD-Base-001',
    oracleRoute: 'ZAR/USD stablecoin reference',
    precision: '8 decimals',
    icon: tokenList.ZARP?.icon,
  },
  USDC: {
    baseSymbol: 'USDC',
    symbol: 'USDC/USD',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 1,
    feedId: 'USDC-USD-Base-001',
    oracleRoute: 'USD/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/usdc.svg',
  },
  USDT: {
    baseSymbol: 'USDT',
    symbol: 'USDT/USD',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 1,
    feedId: 'USDT-USD-Base-001',
    oracleRoute: 'USD/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/usdt.svg',
  },
  ETH: {
    baseSymbol: 'ETH',
    symbol: 'ETH/USD',
    network: 'Ethereum Mainnet',
    assetClass: 'Crypto',
    category: 'Crypto',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 2265.14,
    feedId: 'ETH-USD-Ethereum-001',
    oracleRoute: 'ETH/USD reference price',
    precision: '8 decimals',
    icon: '/images/icons/eth.svg',
  },
  SUI: {
    baseSymbol: 'SUI',
    symbol: 'SUI/USD',
    network: 'Sui Mainnet',
    assetClass: 'Crypto',
    category: 'Crypto',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.704,
    feedId: 'SUI-USD-Sui-001',
    oracleRoute: 'SUI/USD reference price',
    precision: '8 decimals',
    icon: '/images/tokens/sui.svg',
  },
  USDSUI: {
    baseSymbol: 'USDSUI',
    symbol: 'USDSui/USD',
    network: 'Sui Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.5%',
    heartbeat: '00:17:22',
    answerPrefix: '$',
    seedPrice: 0.998,
    feedId: 'USDSUI-USD-Sui-001',
    oracleRoute: 'USDSui/USD reference price',
    precision: '8 decimals',
    icon: '/images/tokens/USDsui.png',
  },
};

const DEFAULT_STABLECOIN_NETWORK = 'Base Mainnet';
const DEFAULT_CRYPTO_NETWORK = 'Ethereum Mainnet';

function getBaseSymbol(symbol: string): string {
  return symbol.split('/')[0]?.toUpperCase() || symbol.toUpperCase();
}

function formatTitleLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatNetworkLabel(network: string): string {
  const normalized = network.toLowerCase();

  if (normalized === 'base-mainnet') return 'Base Mainnet';
  if (normalized === 'base-testnet') return 'Base Testnet';
  if (normalized === 'assetchain-mainnet') return 'Assetchain Mainnet';
  if (normalized === 'mantle-testnet') return 'Mantle Testnet';

  return formatTitleLabel(network);
}

function formatHeartbeat(seconds: number): string {
  if (!seconds) return '00:00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function formatDeviationThreshold(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function inferAnswerPrefix(symbol: string): string {
  const quoteSymbol = symbol.split('/')[1]?.trim().toUpperCase();

  if (quoteSymbol === 'BTC') return '₿';
  return '$';
}

function getFeedIcon(baseSymbol: string, icon?: string) {
  return tokenList[baseSymbol]?.icon || icon;
}

function inferCategory(baseSymbol: string): FeedDefinition['category'] {
  if (['ETH', 'BTC', 'BNB'].includes(baseSymbol)) {
    return 'Crypto';
  }

  return 'Stablecoin';
}

function buildDefaultDefinition(baseSymbol: string): FeedDefinition {
  const category = inferCategory(baseSymbol);

  return {
    baseSymbol,
    network:
      category === 'Crypto'
        ? DEFAULT_CRYPTO_NETWORK
        : DEFAULT_STABLECOIN_NETWORK,
    assetClass: category,
    category,
    deviationThreshold: category === 'Crypto' ? '0.50%' : '0.25%',
    heartbeat: category === 'Crypto' ? '00:01:00' : '00:05:00',
    answerPrefix: '$',
    feedId: `${baseSymbol}-USD-Oracle-001`,
    oracleRoute: `${baseSymbol}/USD reference price`,
    precision: '8 decimals',
    icon: tokenList[baseSymbol]?.icon,
  };
}

function compareFeedSymbols(a: string, b: string): number {
  const aPriority = HOME_FEED_PRIORITY.indexOf(
    a as (typeof HOME_FEED_PRIORITY)[number],
  );
  const bPriority = HOME_FEED_PRIORITY.indexOf(
    b as (typeof HOME_FEED_PRIORITY)[number],
  );

  if (aPriority !== -1 || bPriority !== -1) {
    if (aPriority === -1) return 1;
    if (bPriority === -1) return -1;
    return aPriority - bPriority;
  }

  return a.localeCompare(b);
}

export function buildDataFeedRows(prices: TokenPrice[]): DataFeedRow[] {
  const livePriceMap = new Map<string, TokenPrice>();

  prices.forEach((price) => {
    livePriceMap.set(getBaseSymbol(price.symbol), price);
  });

  const symbols = new Set<string>([
    ...HOME_FEED_PRIORITY,
    ...Object.keys(FEED_DEFINITIONS),
    ...Array.from(livePriceMap.keys()),
  ]);

  return Array.from(symbols)
    .sort(compareFeedSymbols)
    .map((baseSymbol) => {
      const livePrice = livePriceMap.get(baseSymbol);
      const definition =
        FEED_DEFINITIONS[baseSymbol] || buildDefaultDefinition(baseSymbol);

      return {
        baseSymbol,
        symbol: definition.symbol || livePrice?.symbol || `${baseSymbol}/USD`,
        price: livePrice?.price || definition.seedPrice || 0,
        changePct: livePrice?.change_7d_pct || 0,
        network: definition.network,
        assetClass: definition.assetClass,
        category: definition.category,
        deviationThreshold: definition.deviationThreshold,
        heartbeat: definition.heartbeat,
        answerPrefix: definition.answerPrefix || '$',
        feedId: definition.feedId || `${baseSymbol}-USD-Oracle-001`,
        oracleRoute:
          definition.oracleRoute || `${baseSymbol}/USD reference price`,
        precision: definition.precision || '8 decimals',
        categories: [definition.category],
        icon: livePrice?.icon || definition.icon,
      };
    });
}

export function buildDataFeedRowsFromFeeds(feeds: OracleFeed[]): DataFeedRow[] {
  return feeds.map((feed) => {
    const baseSymbol = getBaseSymbol(feed.feed);
    const category = formatTitleLabel(
      feed.asset_class || feed.categories?.[0] || 'Crypto',
    ) as FeedDefinition['category'];

    return {
      baseSymbol: `${baseSymbol}-${feed.chain_id}`,
      symbol: feed.feed,
      price: feed.answer || 0,
      changePct: 0,
      network: formatNetworkLabel(feed.network),
      assetClass: formatTitleLabel(feed.asset_class || 'Crypto'),
      category,
      deviationThreshold: formatDeviationThreshold(feed.deviation_threshold),
      heartbeat: formatHeartbeat(feed.heartbeat),
      answerPrefix: inferAnswerPrefix(feed.feed),
      feedId: `${feed.asset_id}-${feed.chain_id}`,
      oracleRoute: `${feed.feed} on ${formatNetworkLabel(feed.network)}`,
      precision: '8 decimals',
      assetId: feed.asset_id,
      chainId: feed.chain_id,
      chainLogoUrl: feed.chain_logo_url,
      lastUpdated: feed.last_updated,
      categories: [
        category,
        ...(feed.svr_enabled ? ['SVR-enabled'] : []),
        ...(feed.categories || []).map(formatTitleLabel),
      ],
      svrEnabled: feed.svr_enabled,
      icon: getFeedIcon(baseSymbol, feed.asset_logo_url),
    };
  });
}

export function getHomeFeedRows(prices: TokenPrice[]): DataFeedRow[] {
  const rowsBySymbol = new Map(
    buildDataFeedRows(prices).map((row) => [row.baseSymbol, row]),
  );

  return HOME_FEED_PRIORITY.map((symbol) => rowsBySymbol.get(symbol)).filter(
    (row): row is DataFeedRow => Boolean(row),
  );
}

export function formatFeedPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (price >= 1) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  return price.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 7,
  });
}

export function formatFeedChange(changePct: number): string {
  return `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
}

export function getFeedBadgeLabel(symbol: string): string {
  return symbol.slice(0, 4).toUpperCase();
}

export function getFeedSlug(baseSymbol: string): string {
  return baseSymbol.toLowerCase();
}

export function getDataFeedBySlug(prices: TokenPrice[], slug: string) {
  const normalized = slug.toUpperCase();
  return buildDataFeedRows(prices).find((row) => row.baseSymbol === normalized);
}

export function buildFeedChartData(
  row: DataFeedRow,
  range: FeedTimeRange,
): FeedChartPoint[] {
  const labelsByRange: Record<FeedTimeRange, string[]> = {
    live: ['Now -5', 'Now -4', 'Now -3', 'Now -2', 'Now -1', 'Now'],
    '1h': ['00m', '10m', '20m', '30m', '40m', '50m', '60m'],
    '1d': ['00h', '04h', '08h', '12h', '16h', '20h', '24h'],
    '1w': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    '1m': ['W1', 'W2', 'W3', 'W4', 'Now'],
  };

  const profileByRange: Record<FeedTimeRange, number[]> = {
    live: [0.994, 0.998, 1.001, 0.999, 1.002, 1],
    '1h': [0.987, 0.992, 0.998, 1.004, 1.001, 1.007, 1],
    '1d': [0.965, 0.978, 0.991, 1.004, 0.996, 1.012, 1],
    '1w': [0.92, 0.95, 0.98, 0.96, 0.99, 1.04, 1.03],
    '1m': [0.85, 0.93, 0.9, 1.06, 1],
  };

  const labels = labelsByRange[range];
  const profile = profileByRange[range];
  const safePrice = row.price || 1;
  const volatilityBoost = Math.min(Math.abs(row.changePct) / 100, 0.12);

  return labels.map((label, index) => ({
    label,
    value:
      safePrice *
      (profile[index] + volatilityBoost * (index % 2 === 0 ? -0.4 : 0.6)),
  }));
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}
