import { StaticImageData } from 'next/image';
import { TokenPrice } from '@/lib/api';
import { tokenList } from '@/lib/tokens';

export interface FeedDefinition {
  baseSymbol: string;
  network: string;
  assetClass: string;
  category: 'Stablecoin' | 'Crypto' | 'FX';
  deviationThreshold: string;
  heartbeat: string;
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
  feedId: string;
  oracleRoute: string;
  precision: string;
  icon?: string | StaticImageData;
}

export type FeedTimeRange = 'live' | '1h' | '1d' | '1w' | '1m';

export interface FeedChartPoint {
  label: string;
  value: number;
}

export const HOME_FEED_PRIORITY = ['CNGN', 'BRZ', 'ZARP', 'USDC'] as const;
export const HOME_FEED_LIMIT = 6;

const FEED_DEFINITIONS: Record<string, FeedDefinition> = {
  CNGN: {
    baseSymbol: 'CNGN',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.25%',
    heartbeat: '00:05:00',
    feedId: 'CNGN-USD-Base-001',
    oracleRoute: 'NGN/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/cngn.svg',
  },
  BRZ: {
    baseSymbol: 'BRZ',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.25%',
    heartbeat: '00:05:00',
    feedId: 'BRZ-USD-Base-001',
    oracleRoute: 'BRL/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/BRZ.svg',
  },
  ZARP: {
    baseSymbol: 'ZARP',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.25%',
    heartbeat: '00:05:00',
    feedId: 'ZARP-USD-Base-001',
    oracleRoute: 'ZAR/USD stablecoin reference',
    precision: '8 decimals',
    icon: tokenList.ZARP?.icon,
  },
  USDC: {
    baseSymbol: 'USDC',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.15%',
    heartbeat: '00:02:00',
    feedId: 'USDC-USD-Base-001',
    oracleRoute: 'USD/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/usdc.svg',
  },
  USDT: {
    baseSymbol: 'USDT',
    network: 'Base Mainnet',
    assetClass: 'Stablecoin',
    category: 'Stablecoin',
    deviationThreshold: '0.15%',
    heartbeat: '00:02:00',
    feedId: 'USDT-USD-Base-001',
    oracleRoute: 'USD/USD stablecoin reference',
    precision: '8 decimals',
    icon: '/images/icons/usdt.svg',
  },
  ETH: {
    baseSymbol: 'ETH',
    network: 'Ethereum Mainnet',
    assetClass: 'Crypto',
    category: 'Crypto',
    deviationThreshold: '0.50%',
    heartbeat: '00:01:00',
    feedId: 'ETH-USD-Ethereum-001',
    oracleRoute: 'ETH/USD reference price',
    precision: '8 decimals',
    icon: '/images/icons/eth.svg',
  },
};

const DEFAULT_STABLECOIN_NETWORK = 'Base Mainnet';
const DEFAULT_CRYPTO_NETWORK = 'Ethereum Mainnet';

function getBaseSymbol(symbol: string): string {
  return symbol.split('/')[0]?.toUpperCase() || symbol.toUpperCase();
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
        symbol: livePrice?.symbol || `${baseSymbol}/USD`,
        price: livePrice?.price || 0,
        changePct: livePrice?.change_7d_pct || 0,
        network: definition.network,
        assetClass: definition.assetClass,
        category: definition.category,
        deviationThreshold: definition.deviationThreshold,
        heartbeat: definition.heartbeat,
        feedId: definition.feedId || `${baseSymbol}-USD-Oracle-001`,
        oracleRoute: definition.oracleRoute || `${baseSymbol}/USD reference price`,
        precision: definition.precision || '8 decimals',
        icon: livePrice?.icon || definition.icon,
      };
    });
}

export function getHomeFeedRows(prices: TokenPrice[]): DataFeedRow[] {
  return buildDataFeedRows(prices).slice(0, HOME_FEED_LIMIT);
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
    value: safePrice * (profile[index] + volatilityBoost * (index % 2 === 0 ? -0.4 : 0.6)),
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
