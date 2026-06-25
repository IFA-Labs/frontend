import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { CLOCK_ID, normalizeSuiTokenType } from './sui-faucet';
import {
  type SuiSwapAssetConfig,
  type SuiSwapDeployment,
  type SuiSwapQuote,
  SUI_SWAP_DEPLOYMENT,
  SUI_TX_GAS_BUDGET,
  hasBaseSwapDeploymentConfig,
  isConfiguredObjectId,
  getSwapAssetBySymbol,
  getSwapAssetByCoinType,
  readQuote,
  selectInputCoin,
} from './sui-swap';

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
  // One swap per leg, so scale the bounded budget by the number of legs.
  tx.setGasBudget(SUI_TX_GAS_BUDGET * BigInt(Math.max(legs.length, 1)));
  return tx;
}
