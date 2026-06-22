import { bcs } from '@mysten/sui/bcs';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { CLOCK_ID, normalizeSuiTokenType } from './sui-faucet';
import type { SwapDeploymentResponse } from './api';

export interface SuiSwapAssetConfig {
  coinType: string;
  symbol: string;
  name: string;
  decimals: number;
  assetVaultId: string;
  protocolFeeVaultId?: string;
  icon?: string;
  enabled: boolean;
}

export interface SuiSwapDeployment {
  network?: string;
  packageId: string;
  poolId: string;
  priceFeedId: string;
  assets: SuiSwapAssetConfig[];
  sweepTargetTokenType?: string;
  pool?: SwapDeploymentResponse['pool'];
}

export interface SuiSwapQuote {
  rawAmountOut: bigint;
  lpFee: bigint;
  protocolFee: bigint;
  amountOut: bigint;
}

export const FALLBACK_SUI_SWAP_DEPLOYMENT: SuiSwapDeployment = {
  packageId: process.env.NEXT_PUBLIC_IFA_SWAP_PACKAGE_ID || '0x...',
  poolId: process.env.NEXT_PUBLIC_IFA_SWAP_POOL_ID || '0x...',
  priceFeedId: process.env.NEXT_PUBLIC_IFA_PRICE_FEED_ID || '0x...',
  assets: [
    {
      coinType: '0x2::sui::SUI',
      symbol: 'SUI',
      name: 'Sui',
      decimals: 9,
      assetVaultId: process.env.NEXT_PUBLIC_SUI_ASSET_VAULT_ID || '0x...',
      protocolFeeVaultId:
        process.env.NEXT_PUBLIC_SUI_PROTOCOL_FEE_VAULT_ID || '0x...',
      enabled: true,
    },
    {
      coinType: process.env.NEXT_PUBLIC_USDSUI_COIN_TYPE || '0x...::coin::USDSUI',
      symbol: 'USDSui',
      name: 'USDSui',
      decimals: 9,
      assetVaultId: process.env.NEXT_PUBLIC_USDSUI_ASSET_VAULT_ID || '0x...',
      protocolFeeVaultId:
        process.env.NEXT_PUBLIC_USDSUI_PROTOCOL_FEE_VAULT_ID || '0x...',
      icon: '/images/tokens/USDsui.png',
      enabled: true,
    },
    {
      coinType: '0x...::wal::WAL',
      symbol: 'WAL',
      name: 'Walrus',
      decimals: 9,
      assetVaultId: process.env.NEXT_PUBLIC_WAL_ASSET_VAULT_ID || '0x...',
      protocolFeeVaultId:
        process.env.NEXT_PUBLIC_WAL_PROTOCOL_FEE_VAULT_ID || '0x...',
      icon: '/images/networks/Wal.png',
      enabled: true,
    },
  ],
};

export const SUI_SWAP_DEPLOYMENT = FALLBACK_SUI_SWAP_DEPLOYMENT;

/** Derives a display symbol from a coin type, e.g. `0x..::usdsui::USDSUI` -> `USDSUI`. */
export function symbolFromCoinType(coinType: string) {
  const segments = coinType.split('::');
  return segments[segments.length - 1] || coinType;
}

export function normalizeSwapDeploymentConfig(
  deployment?: SwapDeploymentResponse | null,
): SuiSwapDeployment {
  // The pool id is the minimum needed to treat this as a real deployment. The
  // oracle price-feed id may still be pending; downstream config-readiness
  // checks (hasBaseSwapDeploymentConfig) report it as missing until supplied.
  if (!deployment?.pool?.id) {
    return {
      ...FALLBACK_SUI_SWAP_DEPLOYMENT,
      network: deployment?.network || FALLBACK_SUI_SWAP_DEPLOYMENT.network,
    };
  }

  const assets =
    deployment.assets?.map((asset) => {
      const symbol = asset.symbol || symbolFromCoinType(asset.tokenType);
      return {
        coinType: asset.tokenType,
        symbol,
        name: asset.name || symbol,
        decimals: asset.coinDecimals ?? 9,
        assetVaultId: asset.assetVaultId,
        protocolFeeVaultId: asset.protocolFeeVaultId,
        icon: asset.iconUrl,
        enabled: asset.enabled ?? true,
      };
    }) || [];

  return {
    network: deployment.network,
    packageId: deployment.packageId,
    poolId: deployment.pool.id,
    priceFeedId: deployment.oracle?.priceFeedId || '0x...',
    assets: assets.length > 0 ? assets : FALLBACK_SUI_SWAP_DEPLOYMENT.assets,
    sweepTargetTokenType: deployment.sweep?.targetTokenType,
    pool: deployment.pool,
  };
}

export const isConfiguredObjectId = (value?: string) =>
  Boolean(value && value !== '0x...' && !value.includes('...'));

const IFA_SWAP_ABORT_MESSAGES: Record<number, string> = {
  2: 'Pool is paused',
  3: 'Asset is not supported',
  4: 'Asset is temporarily disabled',
  5: 'Asset is already whitelisted',
  6: 'Bad oracle asset index',
  7: 'Bad token decimals',
  8: 'Fee config is invalid',
  9: 'Amount must be greater than zero',
  10: 'Choose two different assets',
  11: 'Oracle price or pair is missing',
  12: 'Oracle price is stale',
  13: 'Pool does not have enough liquidity',
  14: 'Price moved beyond your slippage limit',
  15: 'Trade exceeds max trade limit',
  16: 'Withdrawal exceeds max withdrawal limit',
  17: 'LP supply is zero',
  18: 'Amount is too large',
  19: 'Invalid recipient',
  20: 'Pool minimum liquidity would be breached',
};

export function parseIfaSwapError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (/user rejected|rejected request|reject/i.test(message)) {
    return 'Transaction signing was cancelled in your wallet.';
  }

  const abortMatch = message.match(/MoveAbort.*,\s*(\d+)\)/);
  if (abortMatch) {
    const code = Number(abortMatch[1]);
    return IFA_SWAP_ABORT_MESSAGES[code] || `Transaction failed (abort code ${code}).`;
  }

  return message || 'Unable to complete the swap.';
}

export function getSwapAssetBySymbol(
  symbol?: string,
  deployment = SUI_SWAP_DEPLOYMENT,
) {
  if (!symbol) return undefined;
  return deployment.assets.find(
    (asset) => asset.symbol.toUpperCase() === symbol.toUpperCase(),
  );
}

export function getSwapAssetByCoinType(
  coinType?: string,
  deployment = SUI_SWAP_DEPLOYMENT,
) {
  if (!coinType) return undefined;
  const normalizedCoinType = normalizeSuiTokenType(coinType);
  return deployment.assets.find(
    (asset) => normalizeSuiTokenType(asset.coinType) === normalizedCoinType,
  );
}

/**
 * Resolves the Asset Sweep target asset (USDSui for V1). Prefers the
 * deployment's configured `sweepTargetTokenType`, falling back to the asset
 * whose symbol is USDSui.
 */
export function getSweepTargetAsset(deployment = SUI_SWAP_DEPLOYMENT) {
  if (deployment.sweepTargetTokenType) {
    const byType = getSwapAssetByCoinType(
      deployment.sweepTargetTokenType,
      deployment,
    );
    if (byType) return byType;
  }
  return getSwapAssetBySymbol('USDSui', deployment);
}

/**
 * A dust asset is sweepable when the base deployment is configured, the asset
 * is enabled and not the sweep target, and the asset + target vault object IDs
 * are real (not placeholders).
 */
export function hasSweepLegConfig(
  dustAsset?: SuiSwapAssetConfig,
  targetAsset?: SuiSwapAssetConfig,
  deployment = SUI_SWAP_DEPLOYMENT,
) {
  return (
    hasBaseSwapDeploymentConfig(deployment) &&
    Boolean(dustAsset?.enabled) &&
    Boolean(targetAsset?.enabled) &&
    isConfiguredObjectId(dustAsset?.assetVaultId) &&
    isConfiguredObjectId(targetAsset?.assetVaultId) &&
    isConfiguredObjectId(targetAsset?.protocolFeeVaultId) &&
    normalizeSuiTokenType(dustAsset!.coinType) !==
      normalizeSuiTokenType(targetAsset!.coinType)
  );
}

export function hasBaseSwapDeploymentConfig(deployment = SUI_SWAP_DEPLOYMENT) {
  return (
    isConfiguredObjectId(deployment.packageId) &&
    isConfiguredObjectId(deployment.poolId) &&
    isConfiguredObjectId(deployment.priceFeedId)
  );
}

export function hasSwapPairConfig(
  fromAsset?: SuiSwapAssetConfig,
  toAsset?: SuiSwapAssetConfig,
  deployment = SUI_SWAP_DEPLOYMENT,
) {
  return (
    hasBaseSwapDeploymentConfig(deployment) &&
    Boolean(fromAsset?.enabled) &&
    Boolean(toAsset?.enabled) &&
    isConfiguredObjectId(fromAsset?.assetVaultId) &&
    isConfiguredObjectId(toAsset?.assetVaultId) &&
    isConfiguredObjectId(toAsset?.protocolFeeVaultId)
  );
}

export function parseDecimalAmount(amount: string, decimals: number) {
  const trimmed = amount.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') {
    throw new Error('Enter a valid amount.');
  }

  const [wholePart = '0', fractionalPart = ''] = trimmed.split('.');
  const paddedFraction = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(wholePart || '0') * BigInt(10) ** BigInt(decimals) + BigInt(paddedFraction || '0');
}

export function formatTokenUnits(amount: bigint, decimals: number) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  const fractionText = fraction
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

function devInspectU64(returnValue: [number[], string]) {
  return BigInt(bcs.u64().parse(Uint8Array.from(returnValue[0])));
}

function readQuote(result: Awaited<ReturnType<SuiJsonRpcClient['devInspectTransactionBlock']>>) {
  const status = result.effects.status;
  if (status.status !== 'success') {
    throw new Error(status.error || 'Quote failed.');
  }

  const values = result.results?.flatMap((item) => item.returnValues ?? []) ?? [];
  if (values.length < 4) throw new Error('Quote response was incomplete.');

  return {
    rawAmountOut: devInspectU64(values[0] as [number[], string]),
    lpFee: devInspectU64(values[1] as [number[], string]),
    protocolFee: devInspectU64(values[2] as [number[], string]),
    amountOut: devInspectU64(values[3] as [number[], string]),
  };
}

export async function quoteExactInput({
  client,
  sender,
  fromAsset,
  toAsset,
  amountIn,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  sender: string;
  fromAsset: SuiSwapAssetConfig;
  toAsset: SuiSwapAssetConfig;
  amountIn: bigint;
  deployment?: SuiSwapDeployment;
}): Promise<SuiSwapQuote> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::quote_exact_input`,
    typeArguments: [
      normalizeSuiTokenType(fromAsset.coinType),
      normalizeSuiTokenType(toAsset.coinType),
    ],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(deployment.priceFeedId),
      tx.pure.u64(amountIn),
      tx.object(CLOCK_ID),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });

  return readQuote(result);
}

async function selectInputCoin({
  tx,
  client,
  owner,
  coinType,
  amount,
}: {
  tx: Transaction;
  client: SuiJsonRpcClient;
  owner: string;
  coinType: string;
  amount: bigint;
}) {
  const normalizedCoinType = normalizeSuiTokenType(coinType);

  if (normalizedCoinType === '0x2::sui::SUI') {
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
    return coin;
  }

  const coins = await client.getCoins({
    owner,
    coinType: normalizedCoinType,
  });
  const selected = [];
  let selectedBalance = BigInt(0);

  for (const coin of coins.data) {
    selected.push(coin);
    selectedBalance += BigInt(coin.balance);
    if (selectedBalance >= amount) break;
  }

  if (selectedBalance < amount || selected.length === 0) {
    throw new Error('Insufficient balance.');
  }

  const [primary, ...rest] = selected;
  const primaryCoin = tx.object(primary.coinObjectId);

  if (rest.length > 0) {
    tx.mergeCoins(
      primaryCoin,
      rest.map((coin) => tx.object(coin.coinObjectId)),
    );
  }

  const [coinIn] = tx.splitCoins(primaryCoin, [tx.pure.u64(amount)]);
  return coinIn;
}

export async function createSwapExactInputTransaction({
  client,
  owner,
  fromAsset,
  toAsset,
  amountIn,
  minAmountOut,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  owner: string;
  fromAsset: SuiSwapAssetConfig;
  toAsset: SuiSwapAssetConfig;
  amountIn: bigint;
  minAmountOut: bigint;
  deployment?: SuiSwapDeployment;
}) {
  const tx = new Transaction();
  const coinIn = await selectInputCoin({
    tx,
    client,
    owner,
    coinType: fromAsset.coinType,
    amount: amountIn,
  });

  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::swap_exact_input`,
    typeArguments: [
      normalizeSuiTokenType(fromAsset.coinType),
      normalizeSuiTokenType(toAsset.coinType),
    ],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(fromAsset.assetVaultId),
      tx.object(toAsset.assetVaultId),
      tx.object(toAsset.protocolFeeVaultId || ''),
      tx.object(deployment.priceFeedId),
      coinIn,
      tx.pure.u64(minAmountOut),
      tx.object(CLOCK_ID),
    ],
  });

  tx.setSenderIfNotSet(owner);
  return tx;
}

// --- Liquidity Pool (HLP) ---

export const USD_VALUE_DECIMALS = 30;
export const LP_DECIMALS = 9;

const READ_SENDER =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export function getHlpCoinType(deployment = SUI_SWAP_DEPLOYMENT) {
  return `${deployment.packageId}::hlp::HLP`;
}

function decodeReturnValue(returnValue: [number[], string]) {
  const [bytes, typeTag] = returnValue;
  const data = Uint8Array.from(bytes);
  switch (typeTag) {
    case 'bool':
      return bcs.bool().parse(data);
    case 'u8':
      return BigInt(bcs.u8().parse(data));
    case 'u16':
      return BigInt(bcs.u16().parse(data));
    case 'u32':
      return BigInt(bcs.u32().parse(data));
    case 'u64':
      return BigInt(bcs.u64().parse(data));
    case 'u128':
      return BigInt(bcs.u128().parse(data));
    case 'u256':
      return BigInt(bcs.u256().parse(data));
    case 'address':
      return `0x${Array.from(data)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;
    default:
      return BigInt(bcs.u64().parse(data));
  }
}

function readReturnValues(
  result: Awaited<ReturnType<SuiJsonRpcClient['devInspectTransactionBlock']>>,
) {
  const status = result.effects.status;
  if (status.status !== 'success') {
    throw new Error(status.error || 'Read call failed.');
  }

  const values =
    result.results?.flatMap((item) => item.returnValues ?? []) ?? [];
  return values.map((value) => decodeReturnValue(value as [number[], string]));
}

export interface PoolSummary {
  paused: boolean;
  totalLpSupply: bigint;
  accountedValueUsd: bigint;
  lpFeeBps: bigint;
  protocolFeeBps: bigint;
  maxPriceAgeMs: bigint;
  syncIntervalMs: bigint;
  protocolFeeRecipient: string;
  assetCount: bigint;
}

export async function getPoolSummary({
  client,
  sender = READ_SENDER,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  sender?: string;
  deployment?: SuiSwapDeployment;
}): Promise<PoolSummary> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::get_pool_summary`,
    arguments: [tx.object(deployment.poolId)],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });
  const values = readReturnValues(result);
  if (values.length < 9) throw new Error('Pool summary response was incomplete.');

  return {
    paused: Boolean(values[0]),
    totalLpSupply: values[1] as bigint,
    accountedValueUsd: values[2] as bigint,
    lpFeeBps: values[3] as bigint,
    protocolFeeBps: values[4] as bigint,
    maxPriceAgeMs: values[5] as bigint,
    syncIntervalMs: values[6] as bigint,
    protocolFeeRecipient: String(values[7]),
    assetCount: values[8] as bigint,
  };
}

export async function previewDeposit({
  client,
  sender = READ_SENDER,
  asset,
  amount,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  sender?: string;
  asset: SuiSwapAssetConfig;
  amount: bigint;
  deployment?: SuiSwapDeployment;
}): Promise<bigint> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::preview_deposit`,
    typeArguments: [normalizeSuiTokenType(asset.coinType)],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(deployment.priceFeedId),
      tx.pure.u64(amount),
      tx.object(CLOCK_ID),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });
  return readReturnValues(result)[0] as bigint;
}

export async function previewWithdraw({
  client,
  sender = READ_SENDER,
  asset,
  lpAmount,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  sender?: string;
  asset: SuiSwapAssetConfig;
  lpAmount: bigint;
  deployment?: SuiSwapDeployment;
}): Promise<bigint> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::preview_withdraw`,
    typeArguments: [normalizeSuiTokenType(asset.coinType)],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(deployment.priceFeedId),
      tx.pure.u64(lpAmount),
      tx.object(CLOCK_ID),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });
  return readReturnValues(result)[0] as bigint;
}

export async function createDepositTransaction({
  client,
  owner,
  asset,
  amountIn,
  minLpOut,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  owner: string;
  asset: SuiSwapAssetConfig;
  amountIn: bigint;
  minLpOut: bigint;
  deployment?: SuiSwapDeployment;
}) {
  const tx = new Transaction();
  const coinIn = await selectInputCoin({
    tx,
    client,
    owner,
    coinType: asset.coinType,
    amount: amountIn,
  });

  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::deposit_liquidity`,
    typeArguments: [normalizeSuiTokenType(asset.coinType)],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(asset.assetVaultId),
      tx.object(deployment.priceFeedId),
      coinIn,
      tx.pure.u64(minLpOut),
      tx.object(CLOCK_ID),
    ],
  });

  tx.setSenderIfNotSet(owner);
  return tx;
}

export async function createWithdrawTransaction({
  client,
  owner,
  asset,
  lpAmountIn,
  minAmountOut,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  owner: string;
  asset: SuiSwapAssetConfig;
  lpAmountIn: bigint;
  minAmountOut: bigint;
  deployment?: SuiSwapDeployment;
}) {
  const tx = new Transaction();
  const lpCoin = await selectInputCoin({
    tx,
    client,
    owner,
    coinType: getHlpCoinType(deployment),
    amount: lpAmountIn,
  });

  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::withdraw_liquidity`,
    typeArguments: [normalizeSuiTokenType(asset.coinType)],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(asset.assetVaultId),
      tx.object(deployment.priceFeedId),
      lpCoin,
      tx.pure.u64(minAmountOut),
      tx.object(CLOCK_ID),
    ],
  });

  tx.setSenderIfNotSet(owner);
  return tx;
}

export async function quoteSweep({
  client,
  sender,
  dustAsset,
  targetAsset,
  dustAmount,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  sender: string;
  dustAsset: SuiSwapAssetConfig;
  targetAsset: SuiSwapAssetConfig;
  dustAmount: bigint;
  deployment?: SuiSwapDeployment;
}): Promise<SuiSwapQuote> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${deployment.packageId}::hetero_swap_periphery::quote_sweep`,
    typeArguments: [
      normalizeSuiTokenType(dustAsset.coinType),
      normalizeSuiTokenType(targetAsset.coinType),
    ],
    arguments: [
      tx.object(deployment.poolId),
      tx.object(deployment.priceFeedId),
      tx.pure.u64(dustAmount),
      tx.object(CLOCK_ID),
    ],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });

  return readQuote(result);
}

export interface SweepLeg {
  dustAsset: SuiSwapAssetConfig;
  amountIn: bigint;
  minAmountOut: bigint;
}

/**
 * Builds one PTB containing one typed `sweep<TDust, TTarget>` call per dust
 * leg. Sui Move cannot accept a mixed vector of differently-typed coins, so the
 * heterogeneous list is composed at the PTB layer — all legs execute atomically
 * and the whole transaction reverts if any leg fails.
 */
export async function createSweepTransaction({
  client,
  owner,
  targetAsset,
  legs,
  deployment = SUI_SWAP_DEPLOYMENT,
}: {
  client: SuiJsonRpcClient;
  owner: string;
  targetAsset: SuiSwapAssetConfig;
  legs: SweepLeg[];
  deployment?: SuiSwapDeployment;
}) {
  const tx = new Transaction();

  for (const leg of legs) {
    const dustCoin = await selectInputCoin({
      tx,
      client,
      owner,
      coinType: leg.dustAsset.coinType,
      amount: leg.amountIn,
    });

    tx.moveCall({
      target: `${deployment.packageId}::hetero_swap_periphery::sweep`,
      typeArguments: [
        normalizeSuiTokenType(leg.dustAsset.coinType),
        normalizeSuiTokenType(targetAsset.coinType),
      ],
      arguments: [
        tx.object(deployment.poolId),
        tx.object(leg.dustAsset.assetVaultId),
        tx.object(targetAsset.assetVaultId),
        tx.object(targetAsset.protocolFeeVaultId || ''),
        tx.object(deployment.priceFeedId),
        dustCoin,
        tx.pure.u64(leg.minAmountOut),
        tx.object(CLOCK_ID),
      ],
    });
  }

  tx.setSenderIfNotSet(owner);
  return tx;
}
