'use client';

import Image, { StaticImageData } from 'next/image';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { CircleFlag } from 'react-circle-flags';
import {
  TokenARB,
  TokenBNB,
  TokenBTC,
  TokenETH,
  TokenPOL,
  TokenSUI,
  TokenUSDC,
  TokenUSDT,
} from '@web3icons/react';

type Web3TokenIcon = ComponentType<{
  className?: string;
  size?: number | string;
  variant?: 'branded' | 'mono' | 'background';
}>;

/**
 * Token symbols that ship an icon in @web3icons/react.
 * Symbols not listed here (CNGN, BRZ, ZARP, USDSUI, WAL, BRL, ...) are not in
 * the library and must be supplied as local assets via the `icon` prop.
 */
export const tokenIconComponents: Record<string, Web3TokenIcon> = {
  ARB: TokenARB,
  BNB: TokenBNB,
  BTC: TokenBTC,
  ETH: TokenETH,
  ETHBTC: TokenETH,
  POL: TokenPOL,
  SUI: TokenSUI,
  USDC: TokenUSDC,
  USDT: TokenUSDT,
};

export const hasWeb3TokenIcon = (symbol: string) =>
  Boolean(tokenIconComponents[symbol.toUpperCase()]);

/**
 * Fiat currency symbols (ISO 4217) mapped to circle-flag country codes.
 * Used as a fallback for fiat feeds that have no crypto/token logo.
 */
export const fiatFlagCodes: Record<string, string> = {
  EUR: 'european_union',
  GBP: 'gb',
  GHS: 'gh',
  KES: 'ke',
  NGN: 'ng',
  ZAR: 'za',
};

export const hasFiatFlag = (symbol: string) =>
  Boolean(fiatFlagCodes[symbol.toUpperCase()]);

/**
 * Renders a token icon, preferring the @web3icons/react component when the
 * library has one. Falls back to a provided local asset, then to initials.
 */
export const TokenIcon = ({
  symbol,
  icon,
  size = 24,
}: {
  symbol: string;
  icon?: StaticImageData | string;
  size?: number;
}) => {
  const [failed, setFailed] = useState(false);
  const Web3Icon = tokenIconComponents[symbol.toUpperCase()];

  if (Web3Icon) {
    return (
      <Web3Icon className="web3-token-icon" size={size} variant="branded" />
    );
  }

  if (icon && !failed) {
    const isRemote = typeof icon === 'string' && icon.startsWith('http');
    if (isRemote) {
      return (
        <img
          src={icon as string}
          alt={symbol}
          width={size}
          height={size}
          style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={() => setFailed(true)}
        />
      );
    }

    return (
      <Image
        src={icon}
        alt={symbol}
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  }

  const flagCode = fiatFlagCodes[symbol.toUpperCase()];
  if (flagCode) {
    return (
      <CircleFlag
        countryCode={flagCode}
        height={size}
        width={size}
        title={symbol}
        style={{ flexShrink: 0 }}
      />
    );
  }

  const color = ['#00c2ff', '#8b5cf6', '#00a878', '#e1b12c'][
    symbol.charCodeAt(0) % 4
  ];

  return (
    <span
      className="asset-icon-sm"
      style={{ background: color, width: size, height: size }}
    >
      {symbol[0] || '?'}
    </span>
  );
};
