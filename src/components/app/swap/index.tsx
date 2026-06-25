'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SuiIcon, SwapIcon } from '@/components/svg';
import SelectTokenModal from '@/components/select-token-modal';
import { useSearchParams } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from '@mysten/dapp-kit';
import { parseUnits } from 'viem';
import useExchangeRate from '@/hooks/useExchangeRates';
import apiService from '@/lib/api';
import { getTokenIcon, TokenInfo } from '@/lib/tokens';
import { SwapCTAButton } from './cta-button';
import Image from 'next/image';
import {
  useTokenApproval,
  useSwapExecution,
  getDeadlineTimestamp,
} from '@/lib/SwapIntegration';
import { useToast } from '@/hooks/useToast';
import { usePrices } from '@/contexts/PriceContext';
import {
  createSwapExactInputTransaction,
  formatTokenUnits,
  getSwapAssetBySymbol,
  hasSwapPairConfig,
  isStaleOracleError,
  normalizeSwapDeploymentConfig,
  parseIfaSwapError,
  parseDecimalAmount,
  quoteExactInput,
  SUI_SWAP_DEPLOYMENT,
  type SuiSwapDeployment,
  type SuiSwapQuote,
} from '@/lib/sui-swap';
import Sweep from '@/components/app/sweep';

const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// SUI is also the gas coin, so the swap amount is split off the gas object.
// Swapping the whole balance leaves nothing to pay gas and the tx reverts with
// `InsufficientCoinBalance`. Keep a buffer back when SUI is the input token.
const SUI_GAS_RESERVE = BigInt(50_000_000); // 0.05 SUI

const normalizeNativeAddress = (token: TokenInfo): TokenInfo => {
  if (token.symbol === 'ETH' && (!token.address || token.address === '')) {
    return { ...token, address: NATIVE_TOKEN_ADDRESS, decimals: 18 };
  }
  return token;
};

const getContractToken = (token?: TokenInfo) => ({
  address:
    token?.symbol === 'ETH' || !token?.address || token.address === ''
      ? NATIVE_TOKEN_ADDRESS
      : token.address,
  symbol: token?.symbol || 'ETH',
  decimals: token?.decimals || 18,
});

type SwapMode = 'swap' | 'sweep';
type TokenField = 'from' | 'to';

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

const HIDDEN_SWAP_SYMBOLS = new Set(['ETH', 'USDT']);

const isVisibleSuiSwapAsset = (asset: { symbol: string; enabled: boolean }) =>
  asset.enabled && !HIDDEN_SWAP_SYMBOLS.has(asset.symbol.toUpperCase());

const toSuiTokenInfo = (asset: {
  symbol: string;
  name: string;
  decimals: number;
  coinType: string;
  icon?: TokenInfo['icon'];
}): TokenInfo => ({
  symbol: asset.symbol,
  name: asset.name,
  decimals: asset.decimals,
  address: asset.coinType,
  icon: getTokenIcon(asset.symbol) || asset.icon || '/images/tokens/eth.svg',
});

const isUserRejectionError = (error: unknown) => {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (error as any)?.shortMessage || '';
  return /user rejected|user denied|user cancelled|rejected by user|declined/i.test(
    msg,
  );
};

const Swap = () => {
  const searchParams = useSearchParams();
  const initialParamsAppliedRef = useRef(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<SwapMode>('swap');
  const [activeTokenField, setActiveTokenField] = useState<TokenField>('from');

  const words = ['Swap', 'Sweep'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [availableTokens, setAvailableTokens] = useState<
    Record<string, TokenInfo>
  >({});
  const [fromToken, setFromToken] = useState<TokenInfo | undefined>(undefined);
  const [toToken, setToToken] = useState<TokenInfo | undefined>(undefined);
  const [fromAmount, setFromAmount] = useState<string>('');

  const [swapDeployment, setSwapDeployment] =
    useState<SuiSwapDeployment>(SUI_SWAP_DEPLOYMENT);
  const [isSwapDeploymentLoading, setIsSwapDeploymentLoading] = useState(true);
  const [swapDeploymentError, setSwapDeploymentError] = useState('');

  const slippageTolerance = 0.5;
  const slippageBps = BigInt(Math.round(slippageTolerance * 100));

  const { address, chain } = useAccount();
  const suiAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const suiClient = useSuiClient();
  const isSuiConnected = Boolean(suiAccount?.address);
  const { showToast } = useToast();

  const [suiSwapQuote, setSuiSwapQuote] = useState<SuiSwapQuote | null>(null);
  const [isSuiQuoteLoading, setIsSuiQuoteLoading] = useState(false);
  const [suiQuoteError, setSuiQuoteError] = useState('');
  const [suiFromBalance, setSuiFromBalance] = useState<bigint | null>(null);
  const [isSuiBalanceLoading, setIsSuiBalanceLoading] = useState(false);
  const [isExecutingSuiSwap, setIsExecutingSuiSwap] = useState(false);

  const {
    isApproved,
    isApproving,
    approve,
    error: approvalError,
  } = useTokenApproval(
    getContractToken(fromToken).address,
    address as `0x${string}` | undefined,
    fromAmount,
    fromToken?.decimals || 18,
  );

  const swapDeadline = useMemo(() => getDeadlineTimestamp(20), []);

  const {
    isSwapping: isSwapLoading,
    isSwapSuccess,
    execute: executeSwap,
    error: swapError,
  } = useSwapExecution({
    fromToken: getContractToken(fromToken),
    toToken: getContractToken(toToken),
    fromAmount,
    slippageTolerance,
    deadline: swapDeadline,
    recipient: address as `0x${string}`,
  });

  useEffect(() => {
    let active = true;
    setIsSwapDeploymentLoading(true);
    setSwapDeploymentError('');

    apiService
      .getSwapDeployment('testnet')
      .then((deployment) => {
        if (!active) return;
        setSwapDeployment(normalizeSwapDeploymentConfig(deployment));
      })
      .catch((error) => {
        if (!active) return;
        setSwapDeployment(normalizeSwapDeploymentConfig(null));
        setSwapDeploymentError(
          error instanceof Error ? error.message : 'Unable to load swap deployment.',
        );
      })
      .finally(() => {
        if (active) setIsSwapDeploymentLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    const typingSpeed = isDeleting ? 80 : 120;
    let timer: NodeJS.Timeout;

    if (!isDeleting && displayedText === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), 1500);
    } else if (isDeleting && displayedText === '') {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timer = setTimeout(() => {
        setDisplayedText((prev) =>
          isDeleting
            ? prev.slice(0, -1)
            : currentWord.slice(0, prev.length + 1),
        );
      }, typingSpeed);
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentWordIndex]);

  useEffect(() => {
    const tokenMap = swapDeployment.assets
      .filter(isVisibleSuiSwapAsset)
      .reduce<Record<string, TokenInfo>>((tokens, asset) => {
        tokens[asset.symbol] = toSuiTokenInfo(asset);
        return tokens;
      }, {});

    setAvailableTokens(tokenMap);
  }, [swapDeployment.assets]);

  const { prices: contextPrices } = usePrices();

  const suiSupportedTokens = useMemo(
    () => swapDeployment.assets.filter(isVisibleSuiSwapAsset).map(toSuiTokenInfo),
    [swapDeployment.assets],
  );

  const tokenPrices = useMemo(() => {
    const priceMap: Record<string, number> = {};
    contextPrices.forEach((item) => {
      priceMap[item.symbol.split('/')[0]] = item.price;
    });
    return priceMap;
  }, [contextPrices]);

  const { rate: exchangeRate } = useExchangeRate(
    fromToken?.symbol || '',
    toToken?.symbol || '',
  );

  const { data: fromTokenBalance, isLoading: isFromBalanceLoading } =
    useBalance({
      address: address,
      token:
        fromToken?.symbol === 'ETH' || !fromToken?.address || fromToken?.address === ''
          ? undefined
          : (fromToken?.address as `0x${string}`),
      chainId: chain?.id,
    });

  const suiFromAsset = useMemo(
    () => getSwapAssetBySymbol(fromToken?.symbol, swapDeployment),
    [fromToken?.symbol, swapDeployment],
  );
  const suiToAsset = useMemo(
    () => getSwapAssetBySymbol(toToken?.symbol, swapDeployment),
    [toToken?.symbol, swapDeployment],
  );

  const amountInBaseUnits = useMemo(() => {
    if (!fromAmount || !suiFromAsset) return BigInt(0);
    try {
      return parseDecimalAmount(fromAmount, suiFromAsset.decimals);
    } catch {
      return BigInt(0);
    }
  }, [fromAmount, suiFromAsset]);

  const suiSwapConfigReady = hasSwapPairConfig(
    suiFromAsset,
    suiToAsset,
    swapDeployment,
  );

  useEffect(() => {
    if (!suiAccount?.address || !suiFromAsset) {
      setSuiFromBalance(null);
      setIsSuiBalanceLoading(false);
      return;
    }

    let active = true;
    setIsSuiBalanceLoading(true);

    suiClient
      .getBalance({ owner: suiAccount.address, coinType: suiFromAsset.coinType })
      .then((balance) => {
        if (active) setSuiFromBalance(BigInt(balance.totalBalance));
      })
      .catch(() => {
        if (active) setSuiFromBalance(null);
      })
      .finally(() => {
        if (active) setIsSuiBalanceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [suiAccount?.address, suiClient, suiFromAsset]);

  useEffect(() => {
    if (
      !suiAccount?.address ||
      !suiFromAsset ||
      !suiToAsset ||
      !suiSwapConfigReady ||
      amountInBaseUnits <= BigInt(0)
    ) {
      setSuiSwapQuote(null);
      setSuiQuoteError('');
      setIsSuiQuoteLoading(false);
      return;
    }

    let active = true;
    setIsSuiQuoteLoading(true);
    setSuiQuoteError('');

    // Debounce so we don't fire a devInspect on every keystroke; rapid-fire
    // calls can get rate-limited by the RPC and surface as a false
    // "Quote unavailable".
    const timer = setTimeout(() => {
      quoteExactInput({
        client: suiClient,
        sender: suiAccount.address,
        fromAsset: suiFromAsset,
        toAsset: suiToAsset,
        amountIn: amountInBaseUnits,
        deployment: swapDeployment,
      })
        .then((quote) => {
          if (active) setSuiSwapQuote(quote);
        })
        .catch((error) => {
          if (!active) return;
          setSuiSwapQuote(null);
          setSuiQuoteError(parseIfaSwapError(error));
        })
        .finally(() => {
          if (active) setIsSuiQuoteLoading(false);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    amountInBaseUnits,
    suiAccount?.address,
    suiClient,
    suiFromAsset,
    swapDeployment,
    suiSwapConfigReady,
    suiToAsset,
  ]);

  useEffect(() => {
    const tokenValues = Object.values(availableTokens);
    if (initialParamsAppliedRef.current || tokenValues.length === 0) return;

    const getTokenBySymbol = (symbol: string | null) =>
      symbol
        ? tokenValues.find(
            (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
          )
        : undefined;

    const nextFromToken =
      getTokenBySymbol(searchParams.get('payToken')) ||
      getTokenBySymbol('SUI') ||
      tokenValues[0];
    const fallbackToToken =
      (getTokenBySymbol('USDSui')?.symbol !== nextFromToken?.symbol
        ? getTokenBySymbol('USDSui')
        : undefined) ||
      tokenValues.find((t) => t.symbol !== nextFromToken?.symbol) ||
      nextFromToken;
    const queryToToken = getTokenBySymbol(searchParams.get('receiveToken'));
    const nextToToken =
      queryToToken?.symbol === nextFromToken?.symbol
        ? fallbackToToken
        : queryToToken || fallbackToToken;

    setFromToken(nextFromToken);
    setToToken(nextToToken);

    const queryPayAmount = searchParams.get('payAmount');
    if (queryPayAmount && /^[0-9]*\.?[0-9]*$/.test(queryPayAmount)) {
      setFromAmount(queryPayAmount);
    }

    initialParamsAppliedRef.current = true;
  }, [searchParams, availableTokens]);

  const swapQuote = useMemo(() => {
    const numericFromAmount = parseFloat(fromAmount);
    const decimals = Math.min(toToken?.decimals || 6, 6);

    if (suiSwapQuote && suiToAsset) {
      const quotedAmount = formatTokenUnits(suiSwapQuote.amountOut, suiToAsset.decimals);
      const minAmountOut =
        (suiSwapQuote.amountOut * (BigInt(10000) - slippageBps)) / BigInt(10000);
      return {
        toAmount: quotedAmount,
        minReceived: formatTokenUnits(minAmountOut, suiToAsset.decimals),
        priceImpact: 'Oracle',
      };
    }

    if (!fromToken || !toToken || !exchangeRate || isNaN(numericFromAmount) || numericFromAmount <= 0) {
      return { toAmount: '', minReceived: '0', priceImpact: 'Low' };
    }

    const calculatedToAmount = (numericFromAmount * exchangeRate).toFixed(decimals);
    const slippageRate = 1 - slippageTolerance / 100;
    const minReceived = (parseFloat(calculatedToAmount) * slippageRate).toFixed(decimals);
    const marketRate =
      tokenPrices[fromToken.symbol] && tokenPrices[toToken.symbol]
        ? tokenPrices[fromToken.symbol] / tokenPrices[toToken.symbol]
        : undefined;
    const impact =
      marketRate && marketRate > 0
        ? Math.abs(1 - exchangeRate / marketRate) * 100
        : 0;

    return {
      toAmount: calculatedToAmount,
      minReceived,
      priceImpact: impact < 1 ? 'Low' : impact < 3 ? 'Medium' : 'High',
    };
  }, [
    exchangeRate,
    fromAmount,
    fromToken,
    slippageTolerance,
    slippageBps,
    suiSwapQuote,
    suiToAsset,
    toToken,
    tokenPrices,
  ]);

  const isOracleStale = isStaleOracleError(suiQuoteError);

  const isCheckingSwapDetails =
    isSuiConnected &&
    Boolean(fromToken) &&
    Boolean(toToken) &&
    parseFloat(fromAmount) > 0 &&
    (isSuiBalanceLoading || isSuiQuoteLoading || isSwapDeploymentLoading);

  const swapProceedDetails = useMemo(() => {
    if (!fromToken || !toToken) return { canProceed: false, message: 'Select tokens' };

    const numericFromAmount = parseFloat(fromAmount);
    if (isNaN(numericFromAmount) || numericFromAmount <= 0)
      return { canProceed: false, message: 'Enter an amount' };
    if (!isSuiConnected) return { canProceed: false, message: 'Connect wallet' };
    if (isSwapDeploymentLoading) return { canProceed: false, message: 'Loading config' };
    if (swapDeploymentError) return { canProceed: false, message: 'Config unavailable' };
    if (!suiFromAsset || !suiToAsset) return { canProceed: false, message: 'Unsupported pair' };
    if (suiFromAsset.coinType === suiToAsset.coinType)
      return { canProceed: false, message: 'Select different tokens' };
    if (!suiSwapConfigReady) return { canProceed: false, message: 'Deployment config missing' };
    if (isSuiBalanceLoading || isSuiQuoteLoading)
      return { canProceed: false, message: 'Checking balance' };
    if (suiFromBalance === null) return { canProceed: false, message: 'Could not fetch balance' };
    if (amountInBaseUnits <= BigInt(0)) return { canProceed: false, message: 'Enter a valid amount' };
    if (amountInBaseUnits > suiFromBalance) return { canProceed: false, message: 'Insufficient balance' };
    const isFromSui = suiFromAsset.symbol.toUpperCase() === 'SUI';
    if (
      isFromSui &&
      amountInBaseUnits > suiFromBalance - SUI_GAS_RESERVE
    )
      return { canProceed: false, message: 'Reserve some SUI for gas' };
    if (suiQuoteError) return { canProceed: false, message: suiQuoteError };
    if (!suiSwapQuote || suiSwapQuote.amountOut <= BigInt(0))
      return { canProceed: false, message: 'Quote unavailable' };

    return { canProceed: true, message: 'Swap' };
  }, [
    amountInBaseUnits,
    fromAmount,
    fromToken,
    isSuiConnected,
    isSuiBalanceLoading,
    isSuiQuoteLoading,
    isSwapDeploymentLoading,
    swapDeploymentError,
    suiFromAsset,
    suiFromBalance,
    suiQuoteError,
    suiSwapConfigReady,
    suiSwapQuote,
    suiToAsset,
    toToken,
  ]);

  const isExecutingSwap = isExecutingSuiSwap || isSwapLoading || isApproving;

  useEffect(() => {
    if (isSwapSuccess) setFromAmount('');
  }, [isSwapSuccess]);

  useEffect(() => {
    if (approvalError) {
      showToast({
        type: isUserRejectionError(approvalError) ? 'info' : 'error',
        title: isUserRejectionError(approvalError)
          ? 'Transaction Cancelled'
          : 'Approval Failed',
        message: isUserRejectionError(approvalError)
          ? 'You cancelled the token approval transaction.'
          : approvalError.message?.includes('insufficient funds')
            ? 'Insufficient funds for approval.'
            : 'Failed to approve token. Please try again.',
        duration: isUserRejectionError(approvalError) ? 3000 : 5000,
      });
    }

    if (swapError) {
      showToast({
        type: isUserRejectionError(swapError) ? 'info' : 'error',
        title: isUserRejectionError(swapError) ? 'Transaction Cancelled' : 'Swap Failed',
        message: isUserRejectionError(swapError)
          ? 'You cancelled the swap transaction.'
          : swapError.message?.includes('insufficient funds')
            ? 'Insufficient funds for transaction.'
            : swapError.message?.includes('gas required exceeds allowance')
              ? 'Insufficient gas. Please try with a higher gas limit.'
              : swapError.message?.includes('execution reverted')
                ? 'Transaction reverted. Check your input amounts and try again.'
                : 'Transaction failed. Please try again.',
        duration: isUserRejectionError(swapError) ? 3000 : 5000,
      });
    }
  }, [approvalError, swapError, showToast]);

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') setFromAmount(value);
  };

  const openTokenSelectionModal = (field: TokenField) => {
    setActiveTokenField(field);
    setModalOpen(true);
  };

  const handleTokenSelect = (selectedToken: TokenInfo) => {
    if (activeTokenField === 'from') {
      if (toToken?.symbol === selectedToken.symbol) setToToken(fromToken);
      setFromToken(selectedToken);
    } else {
      if (fromToken?.symbol === selectedToken.symbol) setFromToken(toToken);
      setToToken(selectedToken);
    }
    setModalOpen(false);
    setFromAmount('');
  };

  const handleSwapTokensAndAmounts = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(swapQuote.toAmount);
  };

  const getFormattedPrice = () => {
    if (suiSwapQuote && suiFromAsset && suiToAsset && amountInBaseUnits > BigInt(0)) {
      const inputUnit = BigInt(10) ** BigInt(suiFromAsset.decimals);
      const quotedPerUnit = (suiSwapQuote.amountOut * inputUnit) / amountInBaseUnits;
      return `1 ${suiFromAsset.symbol} ≈ ${formatTokenUnits(quotedPerUnit, suiToAsset.decimals)} ${suiToAsset.symbol}`;
    }
    if (!fromToken || !toToken || !exchangeRate) return '...';
    return `1 ${fromToken.symbol} ≈ ${exchangeRate.toFixed(6)} ${toToken.symbol}`;
  };

  const executeTransaction = async () => {
    if (
      !suiAccount?.address ||
      !suiFromAsset ||
      !suiToAsset ||
      !suiSwapQuote ||
      !swapProceedDetails.canProceed
    ) {
      showToast({
        type: 'info',
        title: 'Swap Not Ready',
        message: swapProceedDetails.message,
        duration: 4000,
      });
      return;
    }

    const signTransactionFeature = currentWallet?.features['sui:signTransaction'];
    if (!signTransactionFeature) {
      throw new Error(
        'Connected wallet does not support sui:signTransaction. Update or switch wallets.',
      );
    }

    setIsExecutingSuiSwap(true);

    try {
      const minAmountOut =
        (suiSwapQuote.amountOut * (BigInt(10000) - slippageBps)) / BigInt(10000);
      const tx = await createSwapExactInputTransaction({
        client: suiClient,
        owner: suiAccount.address,
        fromAsset: suiFromAsset,
        toAsset: suiToAsset,
        amountIn: amountInBaseUnits,
        minAmountOut,
        deployment: swapDeployment,
      });

      const preflight = await suiClient.devInspectTransactionBlock({
        sender: suiAccount.address,
        transactionBlock: tx,
      });
      if (preflight.effects.status.status !== 'success') {
        throw new Error(preflight.effects.status.error || 'Swap preflight failed.');
      }

      // Hand the wallet the UNBUILT transaction so it resolves gas with the
      // full SUI coin set. Pre-building and passing resolved gas data made
      // wallets (e.g. Slush) re-pick a single gas coin, so splitting the swap
      // amount off the gas coin reverted once it exceeded that one coin
      // (~half the balance).
      const transactionJson = await tx.toJSON();
      const chainId = suiAccount.chains?.[0] || 'sui:testnet';

      const { bytes, signature } = await signTransactionFeature.signTransaction({
        transaction: { toJSON: async () => transactionJson },
        account: suiAccount,
        chain: chainId,
      });

      const receivedAmount = formatTokenUnits(suiSwapQuote.amountOut, suiToAsset.decimals);

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showBalanceChanges: true },
      });

      await suiClient.waitForTransaction({ digest: result.digest });
      if (result.effects?.status?.status !== 'success') {
        throw new Error(result.effects?.status?.error || 'Swap failed on-chain.');
      }

      showToast({
        type: 'success',
        title: 'Swap Successful',
        message: `Swapped ${fromAmount} ${suiFromAsset.symbol} for ~${receivedAmount} ${suiToAsset.symbol}. Digest: ${result.digest.slice(0, 10)}...`,
        duration: 7000,
      });
      setFromAmount('');
      setSuiSwapQuote(null);
    } catch (error) {
      showToast({
        type: isUserRejectionError(error) ? 'info' : 'error',
        title: isUserRejectionError(error) ? 'Transaction Cancelled' : 'Swap Failed',
        message:
          error instanceof Error
            ? parseIfaSwapError(error)
            : 'Unable to execute the swap transaction.',
        duration: 6000,
      });
    } finally {
      setIsExecutingSuiSwap(false);
    }
  };

  const payTokenDisplay = {
    icon: fromToken?.icon || '/images/tokens/eth.svg',
    name: fromToken?.symbol || 'SUI',
  };
  const receiveTokenDisplay = {
    icon: toToken?.icon || '/images/tokens/USDsui.png',
    name: toToken?.symbol || 'USDSui',
  };

  return (
    <div className="swap-section-container">
      <div className="swap-header">
        <div className="swap-header-title">
          <span>
            <span className="animated-word">{displayedText}</span>
            <span className="cursor">|</span>
          </span>
          <br />
          Tokens
        </div>
        <div className="swap-header-description">
          Swap tokens with ease using our secure and user-friendly platform
        </div>
      </div>

      <div className="swap-mode-tabs" role="tablist" aria-label="Swap mode">
        <button
          type="button"
          className={activeMode === 'swap' ? 'active' : ''}
          onClick={() => setActiveMode('swap')}
          role="tab"
          aria-selected={activeMode === 'swap'}
        >
          Swap
        </button>
        <button
          type="button"
          className={activeMode === 'sweep' ? 'active' : ''}
          onClick={() => setActiveMode('sweep')}
          role="tab"
          aria-selected={activeMode === 'sweep'}
        >
          Sweep
        </button>
      </div>

      <main className="swap-main">
        <div className="swap-container">
          {activeMode === 'swap' ? (
            <>
              {isOracleStale && (
                <div className="swap-oracle-banner" role="alert">
                  Oracle prices are stale right now, so swaps are paused. Quotes
                  will resume automatically once the feed refreshes.
                </div>
              )}
              <div className="swap-input-container">
                <div className="swap-input">
                  <div className="swap-form">
                    <label htmlFor="You Pay">You Pay</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={fromAmount}
                      onChange={handleFromAmountChange}
                    />
                  </div>
                  <button
                    className="token"
                    onClick={() => openTokenSelectionModal('from')}
                  >
                    <div className="icon">
                      <TokenLogo
                        symbol={payTokenDisplay.name}
                        icon={payTokenDisplay.icon}
                        size={24}
                      />
                      <span>{payTokenDisplay.name}</span>
                    </div>
                  </button>
                </div>

                <button
                  className="swap-input-button"
                  title="Exchange values"
                  onClick={handleSwapTokensAndAmounts}
                >
                  <SwapIcon />
                </button>

                <div className="swap-input">
                  <div className="swap-form">
                    <label htmlFor="You Receive">You Receive</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={swapQuote.toAmount}
                      readOnly
                      disabled={isCheckingSwapDetails || isExecutingSwap}
                    />
                  </div>
                  <button
                    className="token"
                    onClick={() => openTokenSelectionModal('to')}
                  >
                    <div className="icon">
                      <TokenLogo
                        symbol={receiveTokenDisplay.name}
                        icon={receiveTokenDisplay.icon}
                        size={24}
                      />
                      <span>{receiveTokenDisplay.name}</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="slippage-container">
                <div className="slippage">
                  <div className="label">Price</div>
                  <div className="value">{getFormattedPrice()}</div>
                </div>
                <div className="slippage">
                  <div className="label">Min received</div>
                  <div className="value">
                    {swapQuote.minReceived} {toToken?.symbol}
                  </div>
                </div>
                <div className="slippage">
                  <div className="label">Price impact</div>
                  <div className="value">{swapQuote.priceImpact}</div>
                </div>
                <div className="slippage">
                  <div className="label">Order Routing</div>
                  <div className="value">IfaSwap</div>
                </div>
              </div>

              <SwapCTAButton
                inputAmount={fromAmount}
                isCheckingDetails={isCheckingSwapDetails}
                proceedDetails={swapProceedDetails}
                isExecutingSwap={isExecutingSwap}
                onProceed={executeTransaction}
                fromTokenSymbol={fromToken?.symbol}
                toTokenSymbol={toToken?.symbol}
              />
            </>
          ) : (
            <Sweep />
          )}

          <SelectTokenModal
            isOpen={isModalOpen}
            onClose={() => setModalOpen(false)}
            onSelect={handleTokenSelect}
            availableTokens={suiSupportedTokens}
            activeTokenField={activeTokenField}
          />
        </div>
      </main>
    </div>
  );
};

export default Swap;
