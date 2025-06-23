import axios from 'axios';
import { tokenList } from '@/lib/tokens';
import { StaticImageData } from 'next/image';

const API_BASE_URL = '/api';

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
      console.error('Error fetching assets:', error);
      throw error;
    }
  }

  async getAssetIdBySymbol(symbol: string): Promise<string | null> {
    const assets = await this.getAssets();
    const asset = assets.find((a) => a.asset === symbol);
    return asset ? asset.asset_id : null;
  }

  // Helper method to calculate the actual price from value and expo
  private calculatePrice(value: number, expo: number): number {
    return value * Math.pow(10, expo);
  }

  async getLatestPrice(
    assetId: string,
  ): Promise<{ price: number; change_7d?: number; change_7d_pct?: number }> {
    try {
      console.log(`Fetching price for assetId: ${assetId}`);
      console.log(`URL: ${API_BASE_URL}/prices/last?asset=${assetId}`);

      const response = await axios.get<PriceResponse>(
        `${API_BASE_URL}/prices/last?asset=${assetId}`,
      );

      console.log('Raw API response:', response.data);

      // The response is directly the price data, not wrapped in an object with assetId as key
      const priceData = response.data;
      if (!priceData || !priceData.value) {
        console.warn(`No price data found for assetId: ${assetId}`);
        return { price: 0 };
      }

      const price = this.calculatePrice(priceData.value, priceData.expo);
      console.log(`Calculated price for ${assetId}: ${price}`);

      // Extract 7-day change data if available
      const change7d = priceData.price_changes?.find(
        (change) => change.period === '7d',
      );

      return {
        price,
        change_7d: change7d?.change,
        change_7d_pct: change7d?.change_pct,
      };
    } catch (error) {
      console.error(`Error fetching price for asset ${assetId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Request URL:', error.config?.url);
      }
      // Return default values instead of throwing
      return { price: 0 };
    }
  }

  async getAllTokenPrices(): Promise<TokenPrice[]> {
    const assets = await this.getAssets();
    console.log('Available assets:', assets);

    const tokenSymbols = assets.map((asset) => {
      const symbol = asset.asset.split('/')[0];
      return {
        symbol: asset.asset,
        assetId: asset.asset_id,
        token: symbol,
      };
    });

    console.log('Token symbols to fetch:', tokenSymbols);

    const pricePromises = tokenSymbols.map(
      async ({ symbol, assetId, token }) => {
        const { price, change_7d, change_7d_pct } = await this.getLatestPrice(
          assetId,
        );
        return {
          symbol,
          price,
          change_7d,
          change_7d_pct,
          icon: this.getTokenIcon(token),
        };
      },
    );

    return Promise.all(pricePromises);
  }

  private getTokenIcon(token: string): StaticImageData {
   
    return tokenList[token]?.icon || '/images/tokens/eth.svg';
  }

  // Helper method to get price for specific token pair
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

      // Calculate the exchange rate (fromToken to toToken)
      if (toPrice === 0) return null;
      return fromPrice / toPrice;
    } catch (error) {
      console.error(
        `Error calculating price for ${fromToken}/${toToken}:`,
        error,
      );
      return null;
    }
  }
}

export default ApiService.getInstance();
