'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { InfoIcon, SuiIcon } from '../../svg';
import { useToast } from '@/hooks/useToast';
import apiService from '@/lib/api';
import { getTokenIcon } from '@/lib/tokens';
import {
  formatTokenUnits,
  getSwapAssetBySymbol,
  hasBaseSwapDeploymentConfig,
  isConfiguredObjectId,
  normalizeSwapDeploymentConfig,
  parseDecimalAmount,
  parseIfaSwapError,
  SUI_SWAP_DEPLOYMENT,
  type SuiSwapDeployment,
} from '@/lib/sui-swap';
import {
  createDepositTransaction,
  createWithdrawTransaction,
  getHlpCoinType,
  getPoolSummary,
  LP_DECIMALS,
  previewDeposit,
  previewWithdraw,
  USD_VALUE_DECIMALS,
  type PoolSummary,
} from '@/lib/sui-pool';

type PoolMode = 'add' | 'withdraw';

const TokenLogo = ({ symbol, iconUrl, size = 24 }: { symbol: string; iconUrl?: string; size?: number }) => {
  if (symbol.toUpperCase() === 'SUI') return <SuiIcon />;
  const src = iconUrl || getTokenIcon(symbol) || '/images/tokens/eth.svg';
  return <Image src={src as string} alt={symbol} width={size} height={size} />;
};

interface AssetOption { symbol: string; coinType: string; iconUrl?: string }

const PoolAssetDropdown = ({
  options,
  value,
  onChange,
}: {
  options: AssetOption[];
  value: string;
  onChange: (symbol: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.symbol === value);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 160) });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="pool-asset-btn"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="pool-asset-btn-icon">
          <TokenLogo symbol={selected?.symbol || ''} iconUrl={selected?.iconUrl} size={22} />
        </span>
        <span className="pool-asset-btn-label">{selected?.symbol || '—'}</span>
        <span className={`pool-asset-btn-chevron ${open ? 'open' : ''}`}>⌄</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="pool-asset-panel"
          role="listbox"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
        >
          {options.map((opt) => (
            <button
              key={opt.coinType}
              type="button"
              role="option"
              aria-selected={opt.symbol === value}
              className={`pool-asset-option ${opt.symbol === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.symbol); setOpen(false); }}
            >
              <span className="pool-asset-option-icon">
                <TokenLogo symbol={opt.symbol} iconUrl={opt.iconUrl} size={20} />
              </span>
              {opt.symbol}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const SLIPPAGE_TOLERANCE = 0.5;
const SLIPPAGE_BPS = BigInt(Math.round(SLIPPAGE_TOLERANCE * 100));

const applySlippage = (amount: bigint) =>
  (amount * (BigInt(10000) - SLIPPAGE_BPS)) / BigInt(10000);

const usdFromValue = (value: bigint) =>
  Number(formatTokenUnits(value, USD_VALUE_DECIMALS));

const formatExactUsd = (value: bigint) =>
  `$${usdFromValue(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatAmount = (value: number, maximumFractionDigits = 6) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
  });

const isUserRejection = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return /reject|denied|cancelled|declined/.test(message);
};

const Pool = () => {
  const suiAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const suiClient = useSuiClient();
  const { showToast } = useToast();
  const isConnected = Boolean(suiAccount?.address);
  const tvlValueRef = useRef<HTMLDivElement>(null);

  const [deployment, setDeployment] =
    useState<SuiSwapDeployment>(SUI_SWAP_DEPLOYMENT);
  const [deploymentError, setDeploymentError] = useState('');

  const [mode, setMode] = useState<PoolMode>('add');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [amount, setAmount] = useState('');

  const [poolSummary, setPoolSummary] = useState<PoolSummary | null>(null);
  const [hlpBalance, setHlpBalance] = useState<bigint>(BigInt(0));
  const [assetBalance, setAssetBalance] = useState<bigint>(BigInt(0));

  const [previewOut, setPreviewOut] = useState<bigint | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const baseConfigReady = hasBaseSwapDeploymentConfig(deployment);
  const enabledAssets = useMemo(
    () => deployment.assets.filter((asset) => asset.enabled),
    [deployment.assets],
  );

  const assetOptions: AssetOption[] = useMemo(
    () => enabledAssets.map((a) => ({
      symbol: a.symbol,
      coinType: a.coinType,
      iconUrl: typeof a.icon === 'string' ? a.icon : undefined,
    })),
    [enabledAssets],
  );
  const selectedAsset = useMemo(
    () => getSwapAssetBySymbol(assetSymbol, deployment),
    [assetSymbol, deployment],
  );

  useEffect(() => {
    let active = true;
    apiService
      .getSwapDeployment('testnet')
      .then((config) => {
        if (!active) return;
        setDeployment(normalizeSwapDeploymentConfig(config));
      })
      .catch((error) => {
        if (!active) return;
        setDeployment(normalizeSwapDeploymentConfig(null));
        setDeploymentError(
          error instanceof Error
            ? error.message
            : 'Unable to load pool deployment.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!assetSymbol && enabledAssets.length > 0) {
      const preferred =
        enabledAssets.find((asset) => asset.symbol.toUpperCase() === 'SUI') ||
        enabledAssets[0];
      setAssetSymbol(preferred.symbol);
    }
  }, [assetSymbol, enabledAssets]);

  useEffect(() => {
    if (!isConfiguredObjectId(deployment.poolId)) {
      setPoolSummary(null);
      return;
    }
    let active = true;
    getPoolSummary({
      client: suiClient,
      sender: suiAccount?.address,
      deployment,
    })
      .then((summary) => {
        if (active) setPoolSummary(summary);
      })
      .catch(() => {
        if (active) setPoolSummary(null);
      });
    return () => {
      active = false;
    };
  }, [deployment, suiClient, suiAccount?.address, isExecuting]);

  useEffect(() => {
    if (!suiAccount?.address) {
      setHlpBalance(BigInt(0));
      setAssetBalance(BigInt(0));
      return;
    }
    let active = true;

    suiClient
      .getBalance({
        owner: suiAccount.address,
        coinType: getHlpCoinType(deployment),
      })
      .then((balance) => {
        if (active) setHlpBalance(BigInt(balance.totalBalance));
      })
      .catch(() => {
        if (active) setHlpBalance(BigInt(0));
      });

    if (selectedAsset) {
      suiClient
        .getBalance({
          owner: suiAccount.address,
          coinType: selectedAsset.coinType,
        })
        .then((balance) => {
          if (active) setAssetBalance(BigInt(balance.totalBalance));
        })
        .catch(() => {
          if (active) setAssetBalance(BigInt(0));
        });
    }

    return () => {
      active = false;
    };
  }, [suiAccount?.address, suiClient, deployment, selectedAsset, isExecuting]);

  const amountInBaseUnits = useMemo(() => {
    if (!amount || !selectedAsset) return BigInt(0);
    try {
      const decimals = mode === 'add' ? selectedAsset.decimals : LP_DECIMALS;
      return parseDecimalAmount(amount, decimals);
    } catch {
      return BigInt(0);
    }
  }, [amount, mode, selectedAsset]);

  useEffect(() => {
    if (
      !selectedAsset ||
      !baseConfigReady ||
      amountInBaseUnits <= BigInt(0)
    ) {
      setPreviewOut(null);
      setPreviewError('');
      setIsPreviewing(false);
      return;
    }

    let active = true;
    setIsPreviewing(true);
    setPreviewError('');

    const run =
      mode === 'add'
        ? previewDeposit({
            client: suiClient,
            sender: suiAccount?.address,
            asset: selectedAsset,
            amount: amountInBaseUnits,
            deployment,
          })
        : previewWithdraw({
            client: suiClient,
            sender: suiAccount?.address,
            asset: selectedAsset,
            lpAmount: amountInBaseUnits,
            deployment,
          });

    run
      .then((out) => {
        if (active) setPreviewOut(out);
      })
      .catch((error) => {
        if (!active) return;
        setPreviewOut(null);
        setPreviewError(parseIfaSwapError(error));
      })
      .finally(() => {
        if (active) setIsPreviewing(false);
      });

    return () => {
      active = false;
    };
  }, [
    amountInBaseUnits,
    baseConfigReady,
    deployment,
    mode,
    selectedAsset,
    suiAccount?.address,
    suiClient,
  ]);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const handleMax = () => {
    if (mode === 'add' && selectedAsset) {
      setAmount(formatTokenUnits(assetBalance, selectedAsset.decimals));
    } else if (mode === 'withdraw') {
      setAmount(formatTokenUnits(hlpBalance, LP_DECIMALS));
    }
  };

  const switchMode = (next: PoolMode) => {
    setMode(next);
    setAmount('');
    setPreviewOut(null);
    setPreviewError('');
  };

  const tvlDisplay = poolSummary
    ? formatExactUsd(poolSummary.accountedValueUsd)
    : '—';

  useEffect(() => {
    const el = tvlValueRef.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize) || 56;
      const available = el.clientWidth;
      const needed = el.scrollWidth;
      if (available > 0 && needed > available) {
        const next = Math.max((base * available) / needed, 18);
        el.style.fontSize = `${next}px`;
      }
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [tvlDisplay]);

  const previewLabel = (() => {
    if (!selectedAsset) return null;
    if (mode === 'add') {
      const lp = previewOut ? Number(formatTokenUnits(previewOut, LP_DECIMALS)) : 0;
      return `≈ ${formatAmount(lp)} HLP`;
    }
    const out = previewOut
      ? Number(formatTokenUnits(previewOut, selectedAsset.decimals))
      : 0;
    return `≈ ${formatAmount(out)} ${selectedAsset.symbol}`;
  })();

  const proceed = useMemo(() => {
    if (!isConnected) return { ok: false, label: 'Connect wallet' };
    if (deploymentError) return { ok: false, label: 'Config unavailable' };
    if (!selectedAsset) return { ok: false, label: 'Select an asset' };
    if (!baseConfigReady)
      return { ok: false, label: 'Pool config incomplete' };
    if (amountInBaseUnits <= BigInt(0))
      return { ok: false, label: 'Enter an amount' };
    if (mode === 'add' && amountInBaseUnits > assetBalance)
      return { ok: false, label: 'Insufficient balance' };
    if (mode === 'withdraw' && amountInBaseUnits > hlpBalance)
      return { ok: false, label: 'Insufficient HLP' };
    if (isPreviewing) return { ok: false, label: 'Checking…' };
    if (previewError) return { ok: false, label: 'Preview unavailable' };
    if (!previewOut || previewOut <= BigInt(0))
      return { ok: false, label: 'Preview unavailable' };
    return {
      ok: true,
      label: mode === 'add' ? 'Add Liquidity' : 'Withdraw',
    };
  }, [
    amountInBaseUnits,
    assetBalance,
    baseConfigReady,
    deploymentError,
    hlpBalance,
    isConnected,
    isPreviewing,
    mode,
    previewError,
    previewOut,
    selectedAsset,
  ]);

  const execute = async () => {
    if (!proceed.ok || !selectedAsset || !suiAccount?.address || !previewOut) {
      return;
    }

    const signTransactionFeature =
      currentWallet?.features['sui:signTransaction'];
    if (!signTransactionFeature) {
      showToast({
        type: 'error',
        title: 'Wallet Unsupported',
        message:
          'Connected wallet does not support sui:signTransaction. Update or switch wallets.',
        duration: 6000,
      });
      return;
    }

    setIsExecuting(true);
    try {
      const minOut = applySlippage(previewOut);
      const tx =
        mode === 'add'
          ? await createDepositTransaction({
              client: suiClient,
              owner: suiAccount.address,
              asset: selectedAsset,
              amountIn: amountInBaseUnits,
              minLpOut: minOut,
              deployment,
            })
          : await createWithdrawTransaction({
              client: suiClient,
              owner: suiAccount.address,
              asset: selectedAsset,
              lpAmountIn: amountInBaseUnits,
              minAmountOut: minOut,
              deployment,
            });

      const preflight = await suiClient.devInspectTransactionBlock({
        sender: suiAccount.address,
        transactionBlock: tx,
      });
      if (preflight.effects.status.status !== 'success') {
        throw new Error(
          preflight.effects.status.error || 'Transaction preflight failed.',
        );
      }

      const transactionBytes = await tx.build({ client: suiClient });
      const resolvedTx = Transaction.from(transactionBytes);
      const transactionJson = await resolvedTx.toJSON();
      const chain = suiAccount.chains?.[0] || 'sui:testnet';

      const { bytes, signature } = await signTransactionFeature.signTransaction({
        transaction: { toJSON: async () => transactionJson },
        account: suiAccount,
        chain,
      });

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showBalanceChanges: true },
      });

      showToast({
        type: 'success',
        title: mode === 'add' ? 'Liquidity Added' : 'Withdrawal Submitted',
        message: `${mode === 'add' ? 'Deposited' : 'Withdrew'} ${amount} ${
          mode === 'add' ? selectedAsset.symbol : 'HLP'
        }. Digest: ${result.digest.slice(0, 10)}...`,
        duration: 7000,
      });
      setAmount('');
      setPreviewOut(null);
    } catch (error) {
      showToast({
        type: isUserRejection(error) ? 'info' : 'error',
        title: isUserRejection(error)
          ? 'Transaction Cancelled'
          : mode === 'add'
            ? 'Deposit Failed'
            : 'Withdrawal Failed',
        message:
          error instanceof Error
            ? parseIfaSwapError(error)
            : 'Unable to complete the transaction.',
        duration: 6000,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="pool-container">
      <div className="my-pool-card">
        <div className="tvl">
          <label>
            TVL <InfoIcon />
          </label>
          <div className="tvl-value" ref={tvlValueRef}>
            {tvlDisplay}
          </div>
        </div>

        <div className="pool-stat-list">
          <div className="pool-stat">
            <span>Your HLP</span>
            <strong>{formatAmount(Number(formatTokenUnits(hlpBalance, LP_DECIMALS)))}</strong>
          </div>
          <div className="pool-stat">
            <span>LP Fee</span>
            <strong>
              {poolSummary ? `${Number(poolSummary.lpFeeBps) / 100}%` : '—'}
            </strong>
          </div>
          <div className="pool-stat">
            <span>Protocol Fee</span>
            <strong>
              {poolSummary ? `${Number(poolSummary.protocolFeeBps) / 100}%` : '—'}
            </strong>
          </div>
          <div className="pool-stat">
            <span>Status</span>
            <strong>
              {poolSummary ? (poolSummary.paused ? 'Paused' : 'Active') : '—'}
            </strong>
          </div>
        </div>
      </div>

      <main>
        <div className="my-pool-card-container">
          <div className="my-pool-card-header">
            <div className="my-pool-card-header-title">HLP Liquidity</div>
          </div>

          <div className="pool-mode-tabs" role="tablist">
            <button
              type="button"
              className={mode === 'add' ? 'active' : ''}
              onClick={() => switchMode('add')}
            >
              Add
            </button>
            <button
              type="button"
              className={mode === 'withdraw' ? 'active' : ''}
              onClick={() => switchMode('withdraw')}
            >
              Withdraw
            </button>
          </div>

          {!baseConfigReady && (
            <div className="pool-config-banner">
              {deploymentError ||
                'Pool deployment is missing the oracle price-feed ID. Deposits and withdrawals are disabled until it is configured.'}
            </div>
          )}

          <div className="pool-form">
            <div className="pool-field">
              <div className="pool-field-head">
                <label>{mode === 'add' ? 'You deposit' : 'You burn'}</label>
                <button type="button" className="pool-max" onClick={handleMax}>
                  Max
                </button>
              </div>
              <div className="pool-input-row">
                <input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                />
                {mode === 'add' ? (
                  <PoolAssetDropdown
                    options={assetOptions}
                    value={assetSymbol}
                    onChange={(sym) => { setAssetSymbol(sym); setAmount(''); }}
                  />
                ) : (
                  <div className="pool-fixed-token">
                    <span>HLP</span>
                  </div>
                )}
              </div>
              <div className="pool-balance">
                Balance:{' '}
                {mode === 'add'
                  ? `${formatAmount(
                      Number(
                        formatTokenUnits(
                          assetBalance,
                          selectedAsset?.decimals ?? 9,
                        ),
                      ),
                    )} ${selectedAsset?.symbol ?? ''}`
                  : `${formatAmount(
                      Number(formatTokenUnits(hlpBalance, LP_DECIMALS)),
                    )} HLP`}
              </div>
            </div>

            {mode === 'withdraw' && (
              <div className="pool-field">
                <div className="pool-field-head">
                  <label>You receive</label>
                </div>
                <div className="pool-input-row">
                  <input type="text" value={previewLabel ?? ''} readOnly />
                  <PoolAssetDropdown
                    options={assetOptions}
                    value={assetSymbol}
                    onChange={setAssetSymbol}
                  />
                </div>
              </div>
            )}

            <div className="slippage-container">
              <div className="slippage">
                <div className="label">
                  {mode === 'add' ? 'Est. LP minted' : 'Est. received'}
                </div>
                <div className="value">
                  {isPreviewing ? 'Checking…' : previewLabel ?? '...'}
                </div>
              </div>
              <div className="slippage">
                <div className="label">Slippage</div>
                <div className="value">{SLIPPAGE_TOLERANCE}%</div>
              </div>
              <div className="slippage">
                <div className="label">Order Routing</div>
                <div className="value">IfaSwap · HLP</div>
              </div>
            </div>

            {previewError && (
              <div className="pool-preview-error">{previewError}</div>
            )}

            <button
              type="button"
              className="pool-cta"
              disabled={!proceed.ok || isExecuting}
              onClick={execute}
            >
              {isExecuting ? 'Submitting…' : proceed.label}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pool;
