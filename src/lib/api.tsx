import axios from 'axios';
import { tokenList } from '@/lib/tokens';
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
  private readonly PRICE_CACHE_TTL = 5000;
  private readonly ALL_PRICES_CACHE_TTL = 10000;

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

  async getAuditPrices(fromISO: string, toISO: string, assetId?: string) {
    try {
      const url = `${API_BASE_URL}/prices/audit?from=${encodeURIComponent(
        fromISO,
      )}&to=${encodeURIComponent(toISO)}${
        assetId ? `&asset=${encodeURIComponent(assetId)}` : ''
      }`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  private getTokenIcon(token: string): string | StaticImageData {
    return tokenList[token]?.icon || '/images/tokens/eth.svg';
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
