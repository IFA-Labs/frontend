'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { SuiIcon } from '@/components/svg';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useToast } from '@/hooks/useToast';
import apiService from '@/lib/api';
import { getTokenIcon, TokenInfo } from '@/lib/tokens';
import {
  createSweepTransaction,
  formatTokenUnits,
  getSwapAssetByCoinType,
  getSweepTargetAsset,
  hasSweepLegConfig,
  normalizeSwapDeploymentConfig,
  parseIfaSwapError,
  quoteSweep,
  SUI_SWAP_DEPLOYMENT,
  type SuiSwapDeployment,
  type SuiSwapQuote,
  type SweepLeg,
} from '@/lib/sui-swap';

type SweepExclusionReason =
  | 'Unsupported by IFÁ SWAP'
  | 'Temporarily disabled'
  | 'Already target asset'
  | 'No oracle pair'
  | 'Stale oracle price'
  | 'Above dust threshold'
  | 'Value below estimated gas cost'
  | 'Amount too small after quote'
  | 'Fetching quote'
  | 'Deployment config missing';

interface SweepWalletCoin {
  coinType: string;
  symbol: string;
  balance: number;
  rawBalance: bigint;
  decimals: number;
  coinObjectIds: string[];
  icon?: TokenInfo['icon'];
}

interface SweepIncludedAsset extends SweepWalletCoin {
  amountOut: bigint;
  lpFee: bigint;
  protocolFee: bigint;
  minAmountOut: bigint;
  estimatedUsd: number;
}

interface SweepExcludedAsset extends SweepWalletCoin {
  reason: SweepExclusionReason;
}

type SweepQuoteEntry =
  | { status: 'ok'; quote: SuiSwapQuote }
  | { status: 'error'; reason: SweepExclusionReason };

const MIN_SWEEP_USD_VALUE = 0.01;
const ESTIMATED_GAS_PER_LEG_USD = 0.01;
const ESTIMATED_BASE_GAS_USD = 0.02;
const SLIPPAGE_TOLERANCE = 0.5;
const SLIPPAGE_BPS = BigInt(Math.round(SLIPPAGE_TOLERANCE * 100));

const hasConfiguredObjectId = (value?: string) =>
  Boolean(value && value !== '0x...' && !value.includes('...'));

const toDisplayNumber = (amount: bigint, decimals: number) =>
  Number(formatTokenUnits(amount, decimals));

const formatSweepAmount = (value: number, maximumFractionDigits = 6) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
  });

const isUserRejection = (error: unknown) => {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return /user rejected|user denied|user cancelled|rejected by user|declined/i.test(
    msg,
  );
};

const TokenLogo = ({
  symbol,
  icon,
  size = 24,
}: {
  symbol?: string;
  icon?: TokenInfo['icon'];
  size?: number;
}) => {
  if (symbol?.toUpperCase() === 'SUI') return <SuiIcon />;
  return (
    <Image
      src={icon || getTokenIcon(symbol || '') || '/images/tokens/eth.svg'}
      alt=""
      width={size}
      height={size}
    />
  );
};

const Sweep = () => {
  const suiAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const suiClient = useSuiClient();
  const { showToast } = useToast();
  const isSuiConnected = Boolean(suiAccount?.address);

  const [deployment, setDeployment] =
    useState<SuiSwapDeployment>(SUI_SWAP_DEPLOYMENT);
  const [sweepThreshold, setSweepThreshold] = useState('0.5');
  const [selectedSweepCoinTypes, setSelectedSweepCoinTypes] = useState<
    string[]
  >([]);
  const [walletSweepCoins, setWalletSweepCoins] = useState<SweepWalletCoin[]>(
    [],
  );
  const [isLoadingSweepCoins, setIsLoadingSweepCoins] = useState(false);
  const [isQuotingSweep, setIsQuotingSweep] = useState(false);
  const [sweepQuotes, setSweepQuotes] = useState<
    Record<string, SweepQuoteEntry>
  >({});
  const [isExecutingSweep, setIsExecutingSweep] = useState(false);

  useEffect(() => {
    let active = true;
    apiService
      .getSwapDeployment('testnet')
      .then((config) => {
        if (active) setDeployment(normalizeSwapDeploymentConfig(config));
      })
      .catch(() => {
        if (active) setDeployment(normalizeSwapDeploymentConfig(null));
      });
    return () => {
      active = false;
    };
  }, []);

  const sweepTargetAsset = useMemo(
    () => getSweepTargetAsset(deployment),
    [deployment],
  );
  const sweepTargetSymbol = sweepTargetAsset?.symbol || 'USDSui';
  const sweepTargetDecimals = sweepTargetAsset?.decimals ?? 9;

  useEffect(() => {
    if (!suiAccount?.address) {
      setWalletSweepCoins([]);
      setIsLoadingSweepCoins(false);
      return;
    }

    let active = true;
    setIsLoadingSweepCoins(true);

    (async () => {
      try {
        const balances = await suiClient.getAllBalances({
          owner: suiAccount.address,
        });

        const coins = await Promise.all(
          balances
            .filter((b) => BigInt(b.totalBalance) > BigInt(0))
            .map(async (balance) => {
              const asset = getSwapAssetByCoinType(
                balance.coinType,
                deployment,
              );
              const metadata = asset
                ? null
                : await suiClient
                    .getCoinMetadata({ coinType: balance.coinType })
                    .catch(() => null);
              const symbol =
                asset?.symbol ||
                metadata?.symbol ||
                balance.coinType.split('::').pop() ||
                'TOKEN';
              const decimals = asset?.decimals ?? metadata?.decimals ?? 9;
              const rawBalance = BigInt(balance.totalBalance);
              const coinObjects = await suiClient
                .getCoins({
                  owner: suiAccount.address,
                  coinType: balance.coinType,
                })
                .catch(() => ({ data: [] }));

              return {
                coinType: balance.coinType,
                symbol,
                balance: toDisplayNumber(rawBalance, decimals),
                rawBalance,
                decimals,
                coinObjectIds: coinObjects.data.map((c) => c.coinObjectId),
                icon: asset?.icon || getTokenIcon(symbol),
              } as SweepWalletCoin;
            }),
        );

        if (active) setWalletSweepCoins(coins);
      } catch {
        if (active) setWalletSweepCoins([]);
      } finally {
        if (active) setIsLoadingSweepCoins(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [suiAccount?.address, suiClient, deployment]);

  useEffect(() => {
    if (
      !suiAccount?.address ||
      !sweepTargetAsset ||
      walletSweepCoins.length === 0
    ) {
      setSweepQuotes({});
      setIsQuotingSweep(false);
      return;
    }

    let active = true;
    setIsQuotingSweep(true);

    (async () => {
      const results = await Promise.all(
        walletSweepCoins.map(
          async (coin): Promise<[string, SweepQuoteEntry] | null> => {
            const dustAsset = getSwapAssetByCoinType(
              coin.coinType,
              deployment,
            );
            if (
              !dustAsset ||
              !hasSweepLegConfig(dustAsset, sweepTargetAsset, deployment) ||
              coin.rawBalance <= BigInt(0)
            ) {
              return null;
            }

            try {
              const quote = await quoteSweep({
                client: suiClient,
                sender: suiAccount.address,
                dustAsset,
                targetAsset: sweepTargetAsset,
                dustAmount: coin.rawBalance,
                deployment,
              });
              return [coin.coinType, { status: 'ok', quote }];
            } catch (error) {
              const message = parseIfaSwapError(error);
              const reason: SweepExclusionReason = /stale/i.test(message)
                ? 'Stale oracle price'
                : /missing|pair/i.test(message)
                  ? 'No oracle pair'
                  : 'Amount too small after quote';
              return [coin.coinType, { status: 'error', reason }];
            }
          },
        ),
      );

      if (!active) return;
      const next: Record<string, SweepQuoteEntry> = {};
      for (const result of results) {
        if (result) next[result[0]] = result[1];
      }
      setSweepQuotes(next);
      setIsQuotingSweep(false);
    })();

    return () => {
      active = false;
    };
  }, [
    suiAccount?.address,
    suiClient,
    deployment,
    sweepTargetAsset,
    walletSweepCoins,
  ]);

  const sweepPreview = useMemo(() => {
    const threshold = Number.isFinite(parseFloat(sweepThreshold))
      ? parseFloat(sweepThreshold)
      : 0;
    const included: SweepIncludedAsset[] = [];
    const excluded: SweepExcludedAsset[] = [];

    walletSweepCoins.forEach((coin) => {
      const dustAsset = getSwapAssetByCoinType(coin.coinType, deployment);
      const coinWithIcon = {
        ...coin,
        icon: coin.icon || dustAsset?.icon || getTokenIcon(coin.symbol),
      };

      const exclude = (reason: SweepExclusionReason) =>
        excluded.push({ ...coinWithIcon, reason });

      if (!dustAsset) return exclude('Unsupported by IFÁ SWAP');
      if (sweepTargetAsset && dustAsset.coinType === sweepTargetAsset.coinType)
        return exclude('Already target asset');
      if (!dustAsset.enabled) return exclude('Temporarily disabled');
      if (!hasSweepLegConfig(dustAsset, sweepTargetAsset, deployment))
        return exclude('Deployment config missing');

      const entry = sweepQuotes[coin.coinType];
      if (!entry) return exclude('Fetching quote');
      if (entry.status === 'error') return exclude(entry.reason);

      const { quote } = entry;
      const estimatedUsd = toDisplayNumber(quote.amountOut, sweepTargetDecimals);

      if (quote.amountOut <= BigInt(0) || estimatedUsd < MIN_SWEEP_USD_VALUE)
        return exclude('Amount too small after quote');
      if (estimatedUsd > threshold) return exclude('Above dust threshold');
      if (estimatedUsd < ESTIMATED_GAS_PER_LEG_USD)
        return exclude('Value below estimated gas cost');

      const minAmountOut =
        (quote.amountOut * (BigInt(10000) - SLIPPAGE_BPS)) / BigInt(10000);

      included.push({
        ...coinWithIcon,
        amountOut: quote.amountOut,
        lpFee: quote.lpFee,
        protocolFee: quote.protocolFee,
        minAmountOut,
        estimatedUsd,
      });
    });

    return { included, excluded };
  }, [
    SLIPPAGE_BPS,
    sweepQuotes,
    sweepTargetAsset,
    sweepTargetDecimals,
    sweepThreshold,
    deployment,
    walletSweepCoins,
  ]);

  const selectedSweepCoinTypeSet = useMemo(
    () => new Set(selectedSweepCoinTypes),
    [selectedSweepCoinTypes],
  );

  const selectedSweepAssets = useMemo(
    () =>
      sweepPreview.included.filter((a) =>
        selectedSweepCoinTypeSet.has(a.coinType),
      ),
    [selectedSweepCoinTypeSet, sweepPreview.included],
  );

  const selectedSweepValue = useMemo(
    () => selectedSweepAssets.reduce((t, a) => t + a.estimatedUsd, 0),
    [selectedSweepAssets],
  );

  const selectedSweepReceived = useMemo(
    () =>
      selectedSweepAssets.reduce(
        (t, a) => t + toDisplayNumber(a.amountOut, sweepTargetDecimals),
        0,
      ),
    [selectedSweepAssets, sweepTargetDecimals],
  );

  const estimatedSweepGas =
    ESTIMATED_BASE_GAS_USD + selectedSweepAssets.length * ESTIMATED_GAS_PER_LEG_USD;

  const sweepTargetReady = Boolean(
    sweepTargetAsset?.enabled &&
      hasConfiguredObjectId(sweepTargetAsset.assetVaultId) &&
      hasConfiguredObjectId(sweepTargetAsset.protocolFeeVaultId),
  );

  const selectedSweepConfigsReady = selectedSweepAssets.every((asset) =>
    hasSweepLegConfig(
      getSwapAssetByCoinType(asset.coinType, deployment),
      sweepTargetAsset,
      deployment,
    ),
  );

  const canExecuteSweep =
    isSuiConnected &&
    selectedSweepAssets.length > 0 &&
    sweepTargetReady &&
    selectedSweepConfigsReady &&
    !isExecutingSweep;

  const allIncludedSelected =
    sweepPreview.included.length > 0 &&
    sweepPreview.included.every((a) => selectedSweepCoinTypeSet.has(a.coinType));

  const sweepButtonLabel = (() => {
    if (!isSuiConnected) return 'Connect wallet';
    if (isLoadingSweepCoins) return 'Loading balances';
    if (isQuotingSweep) return 'Quoting…';
    if (isExecutingSweep) return 'Sweeping…';
    if (selectedSweepAssets.length === 0) return 'Select sweep legs';
    if (!sweepTargetReady || !selectedSweepConfigsReady)
      return 'Deployment config missing';
    return `Sweep ${selectedSweepAssets.length} Token${selectedSweepAssets.length === 1 ? '' : 's'}`;
  })();

  const handleAssetToggle = (coinType: string) => {
    setSelectedSweepCoinTypes((prev) =>
      prev.includes(coinType)
        ? prev.filter((ct) => ct !== coinType)
        : [...prev, coinType],
    );
  };

  const handleSelectAll = () => {
    if (allIncludedSelected) {
      setSelectedSweepCoinTypes([]);
    } else {
      setSelectedSweepCoinTypes(sweepPreview.included.map((a) => a.coinType));
    }
  };

  const executeSweep = async () => {
    if (!canExecuteSweep || !suiAccount?.address || !sweepTargetAsset) {
      showToast({
        type: 'info',
        title: 'Sweep Not Ready',
        message:
          sweepButtonLabel === 'Deployment config missing'
            ? 'Add the IFÁ SWAP package, pool, oracle, vault, and USDSui object IDs before submitting a sweep PTB.'
            : sweepButtonLabel,
        duration: 5000,
      });
      return;
    }

    const signTransactionFeature =
      currentWallet?.features['sui:signTransaction'];
    if (!signTransactionFeature) {
      showToast({
        type: 'error',
        title: 'Sweep Failed',
        message:
          'Connected wallet does not support sui:signTransaction. Update or switch wallets.',
        duration: 6000,
      });
      return;
    }

    setIsExecutingSweep(true);

    try {
      const legs: SweepLeg[] = selectedSweepAssets
        .map((asset) => {
          const dustAsset = getSwapAssetByCoinType(asset.coinType, deployment);
          if (!dustAsset) return null;
          return {
            dustAsset,
            amountIn: asset.rawBalance,
            minAmountOut: asset.minAmountOut,
          } satisfies SweepLeg;
        })
        .filter((leg): leg is SweepLeg => leg !== null);

      const tx = await createSweepTransaction({
        client: suiClient,
        owner: suiAccount.address,
        targetAsset: sweepTargetAsset,
        legs,
        deployment,
      });

      // Dry-run the whole PTB first — many legs revert if any one fails.
      const preflight = await suiClient.devInspectTransactionBlock({
        sender: suiAccount.address,
        transactionBlock: tx,
      });
      if (preflight.effects.status.status !== 'success') {
        throw new Error(
          preflight.effects.status.error || 'Sweep preflight failed.',
        );
      }

      const transactionBytes = await tx.build({ client: suiClient });
      const resolvedTx = Transaction.from(transactionBytes);
      const transactionJson = await resolvedTx.toJSON();
      const chainId = suiAccount.chains?.[0] || 'sui:testnet';

      const { bytes, signature } = await signTransactionFeature.signTransaction({
        transaction: { toJSON: async () => transactionJson },
        account: suiAccount,
        chain: chainId,
      });

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showBalanceChanges: true },
      });

      showToast({
        type: 'success',
        title: 'Sweep Submitted',
        message: `Swept ${legs.length} token${legs.length === 1 ? '' : 's'} into ${sweepTargetSymbol}. Digest: ${result.digest.slice(0, 10)}...`,
        duration: 7000,
      });
      setSelectedSweepCoinTypes([]);
    } catch (error) {
      showToast({
        type: isUserRejection(error) ? 'info' : 'error',
        title: isUserRejection(error) ? 'Transaction Cancelled' : 'Sweep Failed',
        message:
          error instanceof Error
            ? parseIfaSwapError(error)
            : 'Unable to execute the sweep transaction.',
        duration: 6000,
      });
    } finally {
      setIsExecutingSweep(false);
    }
  };

  return (
    <div className="sweep-panel">
      <div className="sweep-copy">
        <h2>Asset Sweep</h2>
        <p>Convert eligible dust balances into USDSui in one PTB</p>
      </div>

      <div className="sweep-controls">
        <div className="swap-input sweep-input">
          <div className="swap-form">
            <label htmlFor="dust-threshold">Dust Threshold (USD)</label>
            <input
              id="dust-threshold"
              type="text"
              placeholder="0.5"
              value={sweepThreshold}
              onChange={(e) => {
                const v = e.target.value;
                if (/^[0-9]*\.?[0-9]*$/.test(v) || v === '')
                  setSweepThreshold(v);
              }}
            />
          </div>
        </div>

        <div className="swap-input sweep-input">
          <div className="swap-form">
            <label>Target Asset</label>
            <div className="sweep-fixed-target">
              <span>{sweepTargetSymbol}</span>
              <small>Fixed for V1</small>
            </div>
          </div>
        </div>
      </div>

      <div className="sweep-divider" />

      <div className="sweep-list-header">
        <span>Included Assets ({sweepPreview.included.length} legs)</span>
        <button type="button" onClick={handleSelectAll}>
          {allIncludedSelected ? 'Clear All' : 'Select All'}
        </button>
      </div>

      <div className="sweep-token-list">
        {sweepPreview.included.length > 0 ? (
          sweepPreview.included.map((asset) => (
            <label className="sweep-token-row" key={asset.coinType}>
              <input
                type="checkbox"
                checked={selectedSweepCoinTypeSet.has(asset.coinType)}
                onChange={() => handleAssetToggle(asset.coinType)}
              />
              <span className="sweep-checkbox" />
              <span className="sweep-token-icon">
                <TokenLogo symbol={asset.symbol} icon={asset.icon} size={28} />
              </span>
              <span className="sweep-token-meta">
                <span className="sweep-token-title">
                  {asset.symbol}
                  <span>${asset.estimatedUsd.toFixed(2)}</span>
                </span>
                <span>{formatSweepAmount(asset.balance)} tokens</span>
                <span>
                  Est. out{' '}
                  {formatSweepAmount(
                    toDisplayNumber(asset.amountOut, sweepTargetDecimals),
                  )}{' '}
                  {sweepTargetSymbol}
                </span>
                <span>
                  LP $
                  {toDisplayNumber(asset.lpFee, sweepTargetDecimals).toFixed(4)}{' '}
                  · Protocol $
                  {toDisplayNumber(
                    asset.protocolFee,
                    sweepTargetDecimals,
                  ).toFixed(4)}{' '}
                  · Min{' '}
                  {formatSweepAmount(
                    toDisplayNumber(asset.minAmountOut, sweepTargetDecimals),
                  )}
                </span>
              </span>
            </label>
          ))
        ) : (
          <div className="sweep-empty-row">
            {!isSuiConnected
              ? 'Connect your wallet to scan for dust'
              : isLoadingSweepCoins
                ? 'Loading wallet balances...'
                : isQuotingSweep
                  ? 'Quoting dust balances...'
                  : 'No eligible sweep legs'}
          </div>
        )}
      </div>

      <div className="sweep-list-header sweep-excluded-header">
        <span>Excluded Assets ({sweepPreview.excluded.length} tokens)</span>
      </div>

      <div className="sweep-token-list sweep-excluded-list">
        {sweepPreview.excluded.length > 0 ? (
          sweepPreview.excluded.map((asset) => (
            <div
              className="sweep-token-row excluded"
              key={asset.coinType}
            >
              <span className="sweep-status-dot" />
              <span className="sweep-token-icon">
                <TokenLogo symbol={asset.symbol} icon={asset.icon} size={28} />
              </span>
              <span className="sweep-token-meta">
                <span className="sweep-token-title">
                  {asset.symbol}
                  <span>{asset.reason}</span>
                </span>
                <span>{formatSweepAmount(asset.balance)} tokens</span>
              </span>
            </div>
          ))
        ) : (
          <div className="sweep-empty-row">No excluded assets</div>
        )}
      </div>

      <div className="sweep-divider" />

      <div className="slippage-container sweep-summary">
        <div className="slippage">
          <div className="label">Selected Tokens</div>
          <div className="value">{selectedSweepAssets.length}</div>
        </div>
        <div className="slippage">
          <div className="label">Total Value</div>
          <div className="value">${selectedSweepValue.toFixed(2)}</div>
        </div>
        <div className="slippage">
          <div className="label">Est. Receive</div>
          <div className="value">
            {formatSweepAmount(selectedSweepReceived)} {sweepTargetSymbol}
          </div>
        </div>
        <div className="slippage">
          <div className="label">Slippage</div>
          <div className="value">{(SLIPPAGE_TOLERANCE * 100).toFixed(0)} bps</div>
        </div>
        <div className="slippage">
          <div className="label">Estimated Gas</div>
          <div className="value">${estimatedSweepGas.toFixed(2)}</div>
        </div>
      </div>

      <button
        type="button"
        className="sweep-cta"
        disabled={!canExecuteSweep}
        onClick={executeSweep}
      >
        <span>{sweepButtonLabel}</span>
      </button>

      <p className="sweep-note">
        All swaps executed atomically · Reverts if any leg fails
      </p>
    </div>
  );
};

export default Sweep;
