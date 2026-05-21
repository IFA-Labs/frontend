'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SwapIcon } from '@/components/svg';
import SelectTokenModal from '@/components/select-token-modal';
import { useSearchParams } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits } from 'viem';
import useExchangeRate from '@/hooks/useExchangeRates';
import apiService from '@/lib/api';
import { tokenList, TokenInfo } from '@/lib/tokens';
import { SwapCTAButton } from './cta-button';
import Image from 'next/image';
import {
  useTokenApproval,
  useSwapExecution,
  getDeadlineTimestamp,
} from '@/lib/SwapIntegration';
import { useToast } from '@/hooks/useToast';
import { usePrices } from '@/contexts/PriceContext';

const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

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

const Swap = () => {
  const searchParams = useSearchParams();
  const initialParamsAppliedRef = useRef(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeTokenField, setActiveTokenField] = useState<'from' | 'to'>(
    'from',
  );
  const words = ['Stablecoin', 'Token'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [availableTokens, setAvailableTokens] = useState<
    Record<string, TokenInfo>
  >({});
  const [fromToken, setFromToken] = useState<TokenInfo | undefined>(undefined);
  const [toToken, setToToken] = useState<TokenInfo | undefined>(undefined);
  const [fromAmount, setFromAmount] = useState<string>('');

  const slippageTolerance = 0.5;

  const { address, isConnected, chain } = useAccount();
  const { showToast } = useToast();

  // Contract integration - Token Approval
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

  // Contract integration - Swap Execution
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

  // Fetch available assets from the API
  useEffect(() => {
    const fetchAvailableTokens = async () => {
      try {
        const assets = await apiService.getAssets();
        const tokenMap: Record<string, TokenInfo> = {};

        assets.forEach((asset) => {
          const symbol = asset.asset.split('/')[0];
          if (!tokenMap[symbol]) {
            tokenMap[symbol] = {
              symbol,
              name: symbol,
              decimals: symbol === 'ETH' ? 18 : 6,
              address:
                symbol === 'ETH' && (!asset.address || asset.address === '')
                  ? NATIVE_TOKEN_ADDRESS
                  : asset.address || NATIVE_TOKEN_ADDRESS,
              icon: tokenList[symbol]?.icon || '/images/eth.svg',
              assetId: asset.asset_id,
            };
          }
        });

        setAvailableTokens(tokenMap);
      } catch (error) {
        setAvailableTokens(
          Object.values(tokenList).reduce<Record<string, TokenInfo>>(
            (tokenMap, token) => {
              tokenMap[token.symbol] = normalizeNativeAddress(token);
              return tokenMap;
            },
            {},
          ),
        );
      }
    };

    fetchAvailableTokens();
  }, []);

  const { prices: contextPrices } = usePrices();

  const tokenPrices = useMemo(() => {
    const priceMap: Record<string, number> = {};

    if (contextPrices.length > 0) {
      contextPrices.forEach((item) => {
        const symbol = item.symbol.split('/')[0];
        priceMap[symbol] = item.price;
      });
    }

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
        fromToken?.symbol === 'ETH' ||
        !fromToken?.address ||
        fromToken?.address === ''
          ? undefined
          : (fromToken?.address as `0x${string}`),
      chainId: chain?.id,
    });

  useEffect(() => {
    const tokenValues = Object.values(availableTokens);
    if (initialParamsAppliedRef.current || tokenValues.length === 0) return;

    const getTokenBySymbol = (symbol: string | null) => {
      if (!symbol) return undefined;
      return availableTokens[symbol.toUpperCase()];
    };

    const nextFromToken =
      getTokenBySymbol(searchParams.get('payToken')) ||
      availableTokens['ETH'] ||
      tokenValues[0];
    const fallbackToToken =
      (availableTokens['USDT']?.symbol !== nextFromToken?.symbol
        ? availableTokens['USDT']
        : undefined) ||
      tokenValues.find((token) => token.symbol !== nextFromToken?.symbol) ||
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

    if (
      !fromToken ||
      !toToken ||
      !exchangeRate ||
      isNaN(numericFromAmount) ||
      numericFromAmount <= 0
    ) {
      return {
        toAmount: '',
        minReceived: '0',
        priceImpact: 'Low',
      };
    }

    const calculatedToAmount = (numericFromAmount * exchangeRate).toFixed(
      decimals,
    );
    const slippageRate = 1 - slippageTolerance / 100;
    const minReceived = (parseFloat(calculatedToAmount) * slippageRate).toFixed(
      decimals,
    );
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
    toToken,
    tokenPrices,
  ]);

  const isCheckingSwapDetails =
    isConnected &&
    Boolean(fromToken) &&
    Boolean(toToken) &&
    parseFloat(fromAmount) > 0 &&
    isFromBalanceLoading;

  const swapProceedDetails = useMemo(() => {
    if (!fromToken || !toToken) {
      return { canProceed: false, message: 'Select tokens' };
    }

    const numericFromAmount = parseFloat(fromAmount);
    if (isNaN(numericFromAmount) || numericFromAmount <= 0) {
      return { canProceed: false, message: 'Enter an amount' };
    }

    if (!isConnected) {
      return { canProceed: false, message: 'Connect wallet' };
    }

    if (isFromBalanceLoading) {
      return { canProceed: false, message: 'Checking balance' };
    }

    if (!fromTokenBalance) {
      return { canProceed: false, message: 'Could not fetch balance' };
    }

    try {
      const fromAmountBigInt = parseUnits(fromAmount, fromToken.decimals);
      if (fromAmountBigInt > fromTokenBalance.value) {
        return { canProceed: false, message: 'Insufficient balance' };
      }
    } catch (error) {
      return { canProceed: false, message: 'Enter a valid amount' };
    }

    const isNativeToken =
      fromToken.symbol === 'ETH' || fromToken.address === NATIVE_TOKEN_ADDRESS;

    if (!isNativeToken && !isApproved) {
      return { canProceed: true, message: 'Approve' };
    }

    return { canProceed: true, message: 'Swap' };
  }, [
    fromAmount,
    fromToken,
    fromTokenBalance,
    isApproved,
    isConnected,
    isFromBalanceLoading,
    toToken,
  ]);

  const isExecutingSwap = isSwapLoading || isApproving;

  useEffect(() => {
    if (isSwapSuccess) {
      setFromAmount('');
    }
  }, [isSwapSuccess]);

  // --- Event Handlers ---
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
      setFromAmount(value);
    }
  };

  const openTokenSelectionModal = (field: 'from' | 'to') => {
    setActiveTokenField(field);
    setModalOpen(true);
  };

  const handleTokenSelect = (selectedToken: TokenInfo) => {
    if (activeTokenField === 'from') {
      if (toToken?.symbol === selectedToken.symbol) {
        setToToken(fromToken);
      }
      setFromToken(selectedToken);
    } else {
      if (fromToken?.symbol === selectedToken.symbol) {
        setFromToken(toToken);
      }
      setToToken(selectedToken);
    }
    setModalOpen(false);
    setFromAmount('');
  };

  const handleSwapTokensAndAmounts = () => {
    const tempFromToken = fromToken;
    const tempToToken = toToken;

    setFromToken(tempToToken);
    setToToken(tempFromToken);
    setFromAmount(swapQuote.toAmount);
  };

  const executeTransaction = () => {
    try {
      if (!isApproved && fromToken?.symbol !== 'ETH') {
        if (fromToken?.address && fromToken.address !== NATIVE_TOKEN_ADDRESS) {
          if (approve) {
            approve();
          }
        }
      } else {
        if (executeSwap) {
          executeSwap();
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Calculate formatted price for display
  const getFormattedPrice = () => {
    if (!fromToken || !toToken || !exchangeRate) return '...';
    return `1 ${fromToken.symbol} ≈ ${exchangeRate.toFixed(6)} ${
      toToken.symbol
    }`;
  };

  const payTokenDisplay = {
    icon: fromToken?.icon || '/images/tokens/eth.svg',
    name: fromToken?.symbol || 'ETH',
  };
  const receiveTokenDisplay = {
    icon: toToken?.icon || '/images/tokens/usdt.svg',
    name: toToken?.symbol || 'USDT',
  };

  useEffect(() => {
    if (approvalError) {
      if (isUserRejectionError(approvalError)) {
        showToast({
          type: 'info',
          title: 'Transaction Cancelled',
          message: 'You cancelled the token approval transaction.',
          duration: 3000,
        });
      } else {
        let errorMessage = 'Failed to approve token. Please try again.';

        if (approvalError.message?.includes('insufficient funds')) {
          errorMessage =
            'Insufficient funds for approval. Please check your balance.';
        }

        showToast({
          type: 'error',
          title: 'Approval Failed',
          message: errorMessage,
          duration: 5000,
        });
      }
    }

    if (swapError) {
      if (isUserRejectionError(swapError)) {
       
        showToast({
          type: 'info',
          title: 'Transaction Cancelled',
          message: 'You cancelled the swap transaction.',
          duration: 3000,
        });
      } else {
        // Handle actual errors
        let errorMessage = 'Transaction failed. Please try again.';

        // Handle other specific error cases
        if (swapError.message?.includes('insufficient funds')) {
          errorMessage =
            'Insufficient funds for transaction. Please check your balance.';
        } else if (
          swapError.message?.includes('gas required exceeds allowance')
        ) {
          errorMessage =
            'Insufficient gas for transaction. Please try with higher gas limit.';
        } else if (swapError.message?.includes('execution reverted')) {
          errorMessage =
            'Transaction reverted. Please check your input amounts and try again.';
        }

        showToast({
          type: 'error',
          title: 'Swap Failed',
          message: errorMessage,
          duration: 5000,
        });
      }
    }
  }, [approvalError, swapError, showToast]);

  const isUserRejectionError = (error: any) => {
    if (!error) return false;

    const errorMsg = error.message || error.shortMessage || '';
    const rejectionPhrases = [
      'user rejected',
      'user denied',
      'user cancelled',
      'rejected by user',
      'denied by user',
      'user declined',
      'user rejected the request',
      'user denied transaction signature',
      'metamask tx signature: user denied',
    ];

    return rejectionPhrases.some((phrase) =>
      errorMsg.toLowerCase().includes(phrase.toLowerCase()),
    );
  };

  return (
    <div className="swap-section-container">
      <div className="swap-header">
        <div className="swap-header-title">
          Swap <br />
          <span>
            <span className="animated-word">{displayedText}</span>
            <span className="cursor">|</span>
          </span>
        </div>
        <div className="swap-header-description">
          Swap tokens with ease using our secure and user-friendly platform
        </div>
      </div>
      <main className="swap-main">
        <div className="swap-container">
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
                  <Image
                    src={payTokenDisplay.icon}
                    alt=""
                    width={24}
                    height={24}
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
                  <Image
                    src={receiveTokenDisplay.icon}
                    alt=""
                    width={24}
                    height={24}
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

          <SelectTokenModal
            isOpen={isModalOpen}
            onClose={() => setModalOpen(false)}
            onSelect={handleTokenSelect}
            availableTokens={Object.values(availableTokens)}
            activeTokenField={activeTokenField}
          />
        </div>
      </main>
    </div>
  );
};

export default Swap;
