import CNGNIcon from '../../public/images/tokens/cngn.svg';
import ETHIcon from '../../public/images/tokens/eth.svg';
import USDTIcon from '../../public/images/tokens/usdt.svg';
import { StaticImageData } from 'next/image';
export interface TokenInfo {
  icon: StaticImageData;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  assetId?: string;
}

export const tokenList: { [key: string]: TokenInfo } = {
  ETH: { icon: ETHIcon, name: 'ETH', symbol: 'ETH', address: '', decimals: 18 },
  USDT: {
    icon: USDTIcon,
    name: 'USDT',
    symbol: 'USDT',
    address: '',
    decimals: 6,
  },
  CNGN: {
    icon: CNGNIcon,
    name: 'CNGN',
    symbol: 'CNGN',
    address: '',
    decimals: 18,
  },
  // WETH: {
  //   symbol: 'WETH',
  //   name: 'Wrapped ETH',
  //   decimals: 18,
  //   address: '0xdd13E55209Fd76AfE204dBda4007C227904f0a81',
  //   icon: ETHIcon,
  //   assetId: 'WETH/USDT',
  // },
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
