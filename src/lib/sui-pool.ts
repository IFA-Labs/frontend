import { bcs } from '@mysten/sui/bcs';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { CLOCK_ID, normalizeSuiTokenType } from './sui-faucet';
import {
  type SuiSwapAssetConfig,
  type SuiSwapDeployment,
  SUI_SWAP_DEPLOYMENT,
  selectInputCoin,
} from './sui-swap';

export const USD_VALUE_DECIMALS = 30;
export const LP_DECIMALS = 9;

const READ_SENDER =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

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

export function getHlpCoinType(deployment = SUI_SWAP_DEPLOYMENT) {
  return `${deployment.packageId}::hlp::HLP`;
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
