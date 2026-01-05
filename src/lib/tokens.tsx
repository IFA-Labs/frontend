import CNGNIcon from '../../public/images/tokens/cngn.svg';
import ETHIcon from '../../public/images/tokens/eth.svg';
import USDTIcon from '../../public/images/tokens/usdt.svg';
import BRZIcon from '../../public/images/tokens/BRZ.svg';
import USDCIcon from '../../public/images/tokens/usdc.svg';
import { StaticImageData } from 'next/image';
export interface TokenInfo {
  icon: StaticImageData | string;
  name: string;
  symbol: string;
  /** optional numeric sort order (lower shows first) */
  order?: number;
  address: string;
  decimals: number;
  assetId?: string;
}

export const tokenList: { [key: string]: TokenInfo } = {
  CNGN: {
    icon: CNGNIcon,
    name: 'CNGN',
    symbol: 'CNGN',
    order: 1,
    address: '',
    decimals: 18,
  },
  BRZ: {
    icon: BRZIcon,
    name: 'BRZ',
    symbol: 'BRZ',
    order: 2,
    address: '',
    decimals: 18,
  },
  USDC: {
    icon: USDCIcon,
    name: 'USDC',
    symbol: 'USDC',
    order: 3,
    address: '',
    decimals: 6,
  },
  USDT: {
    icon: USDTIcon,
    name: 'USDT',
    symbol: 'USDT',
    order: 4,
    address: '',
    decimals: 6,
  },
  ETH: {
    icon: ETHIcon,
    name: 'ETH',
    symbol: 'ETH',
    order: 5,
    address: '',
    decimals: 6,
  },
};

export const getTokenFromSymbol = (symbol: string): TokenInfo | null => {
  const baseToken = symbol.split('/')[0];
  return tokenList[baseToken] || null;
};

export const getAvailableTokens = (): TokenInfo[] => {
  return Object.values(tokenList);
};

export const getTokenPairName = (
  baseToken: string,
  quoteToken: string = 'USD',
): string => {
  return `${baseToken}/${quoteToken}`;
};

export const formatPrice = (price: number): string => {
  if (price > 1000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 9 });
  } else if (price > 1) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 9 });
  } else {
    return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
};
