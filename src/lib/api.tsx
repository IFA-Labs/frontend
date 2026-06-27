import axios from 'axios';
import { getTokenIcon } from '@/lib/tokens';
import { StaticImageData } from 'next/image';

// Use environment variable in production; default to secure HTTPS API URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.ifalabs.com/api';

export interface Asset {
  asset_id: string;
  asset: string;
  address?: string;
}

export interface PriceChange {
  period: string;
  change: number;
  change_pct: number;
  from_price: number;
  to_price: number;
  from_time: string;
  to_time: string;
}

export interface PriceResponse {
  id: string;
  assetID: string;
  value: number;
  expo: number;
  timestamp: string;
  source: string;
  req_hash: string;
  req_url: string;
  is_aggr: boolean;
  connected_price_ids: any;
  price_changes: PriceChange[];
}

export interface TokenPrice {
  symbol: string;
  price: number;
  change_7d?: number;
  change_7d_pct?: number;
  icon: string | StaticImageData;
}

export interface OracleFeed {
  feed: string;
  svr_enabled: boolean;
  network: string;
  answer: number;
  deviation_threshold: number;
  heartbeat: number;
  asset_class: string;
  categories: string[];
  asset_id: string;
  chain_id: string;
  asset_logo_url?: string;
  chain_logo_url?: string;
  last_updated?: string;
}

export interface OracleFeedsResponse {
  data: OracleFeed[];
}

export interface AuditRawPrice {
  source: string;
  value: number;
  expo: number;
  timestamp: string;
  reqUrl?: string;
}

export interface AuditPricePoint {
  timestamp: string;
  value: number;
  expo: number;
  source?: string;
  rawPrices: AuditRawPrice[];
}

export interface FaucetNetwork {
  id: string; // chain_id
  label: string; // network name
  logoUrl?: string; // chain_logo_url from API
}

export interface FaucetAsset {
  id: string; // asset_id
  symbol: string; // e.g. "cNGN"
  pair: string; // e.g. "cNGN/USD"
  icon?: StaticImageData | string; // local SVG > API URL > undefined
}

export interface FeedRequestPayload {
  name: string;
  project_name: string;
  email: string;
  supported_blockchains: string[];
  symbols: string[];
  message: string;
  website?: string;
}

export interface FeedRequestResponse extends FeedRequestPayload {
  id: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface SwapDeploymentAsset {
  tokenType: string;
  assetVaultId: string;
  protocolFeeVaultId: string;
  assetIndex?: string;
  assetIndexBytes?: string;
  coinDecimals: number;
  targetWeightBps?: number;
  maxTradeBps?: number;
  maxWithdrawBps?: number;
  minLiquidity?: number | string;
  enabled: boolean;
  symbol: string;
  name?: string;
  iconUrl?: string;
}

export interface SwapDeploymentResponse {
  network: string;
  packageId: string;
  // Some backend deployment payloads put the oracle feed at the top level
  // instead of nested under `oracle`. Support both.
  priceFeedId?: string;
  adminCapId?: string;
  hlpTreasuryCapId?: string | null;
  hlpMetadataCapId?: string;
  pool?: {
    id: string;
    lpFeeBps?: number;
    protocolFeeBps?: number;
    maxPriceAgeMs?: number;
    protocolFeeRecipient?: string;
    syncIntervalMs?: number;
    paused?: boolean;
  };
  assets?: SwapDeploymentAsset[];
  oracle?: {
    priceFeedId?: string;
  };
  sweep?: {
    targetTokenType?: string;
  };
}

class ApiService {
  private static instance: ApiService;
  private assetCache: Asset[] | null = null;
  private priceCache: Map<
    string,
    {
      price: number;
      change_7d?: number;
      change_7d_pct?: number;
      timestamp: number;
    }
  > = new Map();
  private allPricesCache: { data: TokenPrice[]; timestamp: number } | null =
    null;
  private feedsCache: { data: OracleFeed[]; timestamp: number } | null = null;
  private readonly PRICE_CACHE_TTL = 5000;
  private readonly ALL_PRICES_CACHE_TTL = 10000;
  private readonly FEEDS_CACHE_TTL = 10000;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  async getAssets(): Promise<Asset[]> {
    if (this.assetCache) {
      return this.assetCache;
    }

    try {
      const response = await axios.get<Asset[]>(`${API_BASE_URL}/assets`);
      this.assetCache = response.data;
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getSwapDeployment(
    network = 'testnet',
  ): Promise<SwapDeploymentResponse> {
    const response = await axios.get<SwapDeploymentResponse>(
      `/api/swap/deployment?network=${encodeURIComponent(network)}`,
    );
    return response.data;
  }

  async getAssetIdBySymbol(symbol: string): Promise<string | null> {
    const assets = await this.getAssets();
    const asset = assets.find((a) => a.asset === symbol);
    return asset ? asset.asset_id : null;
  }

  private calculatePrice(value: number, expo: number): number {
    return value * Math.pow(10, expo);
  }

  async getLatestPrice(
    assetId: string,
  ): Promise<{ price: number; change_7d?: number; change_7d_pct?: number }> {
    const cached = this.priceCache.get(assetId);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return {
        price: cached.price,
        change_7d: cached.change_7d,
        change_7d_pct: cached.change_7d_pct,
      };
    }

    try {
      const response = await axios.get<PriceResponse>(
        `${API_BASE_URL}/prices/last?asset=${assetId}`,
      );

      const priceData = response.data;
      if (!priceData || !priceData.value) {
        return { price: 0 };
      }

      const price = this.calculatePrice(priceData.value, priceData.expo);

      const change7d = priceData.price_changes?.find(
        (change) => change.period === '7d',
      );

      const result = {
        price,
        change_7d: change7d?.change,
        change_7d_pct: change7d?.change_pct,
      };

      this.priceCache.set(assetId, {
        ...result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      return { price: 0 };
    }
  }

  async getAllTokenPrices(): Promise<TokenPrice[]> {
    if (
      this.allPricesCache &&
      Date.now() - this.allPricesCache.timestamp < this.ALL_PRICES_CACHE_TTL
    ) {
      return this.allPricesCache.data;
    }

    const assets = await this.getAssets();

    const tokenSymbols = assets.map((asset) => {
      const symbol = asset.asset.split('/')[0];
      return {
        symbol: asset.asset,
        assetId: asset.asset_id,
        token: symbol,
      };
    });

    const pricePromises = tokenSymbols.map(
      async ({ symbol, assetId, token }) => {
        const { price, change_7d, change_7d_pct } =
          await this.getLatestPrice(assetId);
        return {
          symbol,
          price,
          change_7d,
          change_7d_pct,
          icon: this.getTokenIcon(token),
        };
      },
    );

    const result = await Promise.all(pricePromises);

    this.allPricesCache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  }

  async getFeeds(params?: {
    network?: string;
    category?: string;
  }): Promise<OracleFeed[]> {
    const hasParams = Boolean(params?.network || params?.category);

    if (
      !hasParams &&
      this.feedsCache &&
      Date.now() - this.feedsCache.timestamp < this.FEEDS_CACHE_TTL
    ) {
      return this.feedsCache.data;
    }

    const response = await axios.get<OracleFeedsResponse>(
      `${API_BASE_URL}/feeds`,
      {
        params: {
          network: params?.network,
          category: params?.category,
        },
      },
    );

    const data = response.data.data || [];

    if (!hasParams) {
      this.feedsCache = {
        data,
        timestamp: Date.now(),
      };
    }

    return data;
  }

  async getFaucetNetworks(): Promise<FaucetNetwork[]> {
    const feeds = await this.getFeeds();
    const seen = new Set<string>();
    const networks: FaucetNetwork[] = [];
    for (const feed of feeds) {
      if (!seen.has(feed.chain_id)) {
        seen.add(feed.chain_id);
        networks.push({
          id: feed.chain_id,
          label: feed.network,
          logoUrl: feed.chain_logo_url,
        });
      }
    }
    return networks;
  }

  async getFaucetAssets(): Promise<FaucetAsset[]> {
    const feeds = await this.getFeeds();
    const seen = new Set<string>();
    const assets: FaucetAsset[] = [];
    for (const feed of feeds) {
      const symbol = feed.feed.split('/')[0];
      if (!seen.has(feed.asset_id)) {
        seen.add(feed.asset_id);
        // Priority: local token icon > API asset_logo_url > undefined
        const localIcon = getTokenIcon(symbol);
        assets.push({
          id: feed.asset_id,
          symbol,
          pair: feed.feed,
          icon: localIcon ?? feed.asset_logo_url,
        });
      }
    }
    return assets;
  }

  async submitFeedRequest(
    payload: FeedRequestPayload,
  ): Promise<FeedRequestResponse> {
    const response = await axios.post<FeedRequestResponse>(
      `${API_BASE_URL}/feed-requests`,
      payload,
    );

    return response.data;
  }

  // Returns the complete, untouched audit response from the backend. Used for
  // the downloadable audit report so the file is a faithful copy of the BE
  // payload (every record, source, hash, and pagination field) rather than the
  // reshaped subset `getAuditPrices` produces for charts.
  async getAuditReport(
    fromISO: string,
    toISO: string,
    assetId?: string,
  ): Promise<unknown> {
    const url = `${API_BASE_URL}/prices/audit?from=${encodeURIComponent(
      fromISO,
    )}&to=${encodeURIComponent(toISO)}${
      assetId ? `&asset=${encodeURIComponent(assetId)}` : ''
    }`;
    const response = await axios.get(url);
    return response.data;
  }

  async getAuditPrices(
    fromISO: string,
    toISO: string,
    assetId?: string,
  ): Promise<AuditPricePoint[]> {
    const url = `${API_BASE_URL}/prices/audit?from=${encodeURIComponent(
      fromISO,
    )}&to=${encodeURIComponent(toISO)}${
      assetId ? `&asset=${encodeURIComponent(assetId)}` : ''
    }`;
    const response = await axios.get(url);
    const raw = response.data;

    // The audit endpoint returns { asset, audit_records: [...], from, to, ... }
    // where each record nests the price under `aggregated_price`. Fall back to
    // the older array / `data` shapes so this stays robust.
    const list: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.audit_records)
        ? raw.audit_records
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

    return list.map((item: any) => {
      const price = item?.aggregated_price ?? item;
      const rawPrices: AuditRawPrice[] = Array.isArray(item?.raw_prices)
        ? item.raw_prices.map((source: any) => ({
            source: source.source ?? '',
            value: source.value ?? source.price ?? 0,
            expo: source.expo ?? 0,
            timestamp: source.timestamp ?? source.time ?? '',
            reqUrl: source.req_url || undefined,
          }))
        : [];

      return {
        timestamp: price.timestamp ?? price.time ?? price.created_at ?? '',
        value: price.value ?? price.price ?? 0,
        expo: price.expo ?? 0,
        source: price.source || undefined,
        rawPrices,
      };
    });
  }

  private getTokenIcon(token: string): string | StaticImageData {
    return getTokenIcon(token) || '/images/tokens/eth.svg';
  }

  async getPriceForPair(
    fromToken: string,
    toToken: string,
  ): Promise<number | null> {
    try {
      const fromAssetId = await this.getAssetIdBySymbol(`${fromToken}/USD`);
      const toAssetId = await this.getAssetIdBySymbol(`${toToken}/USD`);

      if (!fromAssetId || !toAssetId) {
        return null;
      }

      const { price: fromPrice } = await this.getLatestPrice(fromAssetId);
      const { price: toPrice } = await this.getLatestPrice(toAssetId);

      if (toPrice === 0) return null;
      return fromPrice / toPrice;
    } catch (error) {
      return null;
    }
  }
}

export default ApiService.getInstance();
