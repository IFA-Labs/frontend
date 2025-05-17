import axios from 'axios';
import { tokenList } from '@/lib/tokens';
import { StaticImageData } from 'next/image';

const API_BASE_URL = '/api';

export interface Asset {
  asset_id: string;
  asset: string;
  address?: string;
}

export interface PriceResponse {
  [key: string]: number;
}

export interface TokenPrice {
  symbol: string;
  price: number;
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

  async getLatestPrice(assetId: string): Promise<number> {
    try {
      const response = await axios.get<PriceResponse>(
        `${API_BASE_URL}/prices/last?asset=${assetId}`,
      );
      return response.data[assetId] || 0;
    } catch (error) {
      console.error(`Error fetching price for asset ${assetId}:`, error);
      throw error;
    }
  }

  async getAllTokenPrices(): Promise<TokenPrice[]> {
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
        try {
          const price = await this.getLatestPrice(assetId);
          return {
            symbol,
            price,
            icon: this.getTokenIcon(token),
          };
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          return {
            symbol,
            price: 0,
            icon: this.getTokenIcon(token),
          };
        }
      },
    );

    return Promise.all(pricePromises);
  }

  private getTokenIcon(token: string): StaticImageData {
    // Get icon from the tokenList
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

      const fromPrice = await this.getLatestPrice(fromAssetId);
      const toPrice = await this.getLatestPrice(toAssetId);

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
