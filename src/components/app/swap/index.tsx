'use client';
import React, { useState, useEffect } from 'react';
import { SwapIcon } from '@/components/svg';
import SelectTokenModal from '@/components/select-token-modal';
import { useSearchParams } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import useExchangeRate from '@/hooks/useExchangeRates';
import apiService from '@/lib/api';
import { tokenList, TokenInfo, formatPrice } from '@/lib/tokens';
import { SwapCTAButton } from './cta-button';
import { StaticImageData } from 'next/image';
import Image from 'next/image';
import {
  useTokenApproval,
  useSwapExecution,
  getDeadlineTimestamp,
} from '@/lib/SwapIntegration';
import { useToast } from '@/hooks/useToast';

interface TokenDisplay {
  icon: string | StaticImageData;
  name: string;
}

const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const Swap = () => {
  const searchParams = useSearchParams();
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
  const [toAmount, setToAmount] = useState<string>('');

  const [tokens, setTokens] = useState<{
    pay: TokenDisplay;
    receive: TokenDisplay;
  }>({
    pay: { icon: '/images/eth.svg', name: 'ETH' },
    receive: { icon: '/images/usdt.svg', name: 'USDT' },
  });

  const [isCheckingSwapDetails, setIsCheckingSwapDetails] = useState(false);
  const [swapProceedDetails, setSwapProceedDetails] = useState({
    canProceed: false,
    message: 'Enter an amount',
  });
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [priceImpact, setPriceImpact] = useState<string>('Low');
  const [minReceived, setMinReceived] = useState<string>('0');
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [approvalDebugInfo, setApprovalDebugInfo] = useState<string>('');

  const { address, isConnected, chain } = useAccount();
  const { showToast } = useToast();

  // Contract integration - Token Approval
  const {
    isApproved,
    isApproving,
    approve,
    error: approvalError,
  } = useTokenApproval(
    // Use proper token address - for native ETH use the constant instead of empty string
    fromToken?.symbol === 'ETH' &&
      (!fromToken?.address || fromToken?.address === '')
      ? NATIVE_TOKEN_ADDRESS
      : fromToken?.address,
    address as `0x${string}` | undefined,
    fromAmount,
    fromToken?.decimals || 18,
  );

  // Contract integration - Swap Execution
  const swapDeadline = getDeadlineTimestamp(20); // 20 minutes from now

  const {
    isSwapping: isSwapLoading,
    isSwapSuccess,
    execute: executeSwap,
    error: swapError,
  } = useSwapExecution({
    fromToken: fromToken
      ? {
          // Use proper token address for ETH to avoid empty string
          address:
            fromToken.symbol === 'ETH' &&
            (!fromToken.address || fromToken.address === '')
              ? NATIVE_TOKEN_ADDRESS
              : fromToken.address,
          symbol: fromToken.symbol,
          decimals: fromToken.decimals,
        }
      : { address: NATIVE_TOKEN_ADDRESS, symbol: 'ETH', decimals: 18 },
    toToken: toToken
      ? {
          // Use proper token address for ETH to avoid empty string
          address:
            toToken.symbol === 'ETH' &&
            (!toToken.address || toToken.address === '')
              ? NATIVE_TOKEN_ADDRESS
              : toToken.address,
          symbol: toToken.symbol,
          decimals: toToken.decimals,
        }
      : { address: NATIVE_TOKEN_ADDRESS, symbol: 'ETH', decimals: 18 },
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

        // Initialize default tokens if not already set
        if (!fromToken) {
          const defaultFromToken =
            tokenMap['ETH'] || Object.values(tokenMap)[0];
          setFromToken(defaultFromToken);
          setTokens((prev) => ({
            ...prev,
            pay: {
              icon: defaultFromToken?.icon || '/images/tokens/eth.svg',
              name: defaultFromToken?.symbol || 'ETH',
            },
          }));
        }
        if (!toToken) {
          const defaultToToken = tokenMap['USDT'] || Object.values(tokenMap)[1];
          setToToken(defaultToToken);
          setTokens((prev) => ({
            ...prev,
            receive: {
              icon: defaultToToken?.icon || '/images/tokens/usdt.svg',
              name: defaultToToken?.symbol || 'USDT',
            },
          }));
        }
      } catch (error) {
        console.error('Error fetching available tokens:', error);
      }
    };

    fetchAvailableTokens();
  }, []);

  // Fetch token prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const prices = await apiService.getAllTokenPrices();
        const priceMap: Record<string, number> = {};

        prices.forEach((item) => {
          const symbol = item.symbol.split('/')[0];
          priceMap[symbol] = item.price;
        });

        setTokenPrices(priceMap);
      } catch (error) {
        console.error('Error fetching token prices:', error);
      }
    };

    fetchPrices();
    // Set up regular price updates
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Use the exchange rate hook
  const { rate: exchangeRate, loading: rateLoading } = useExchangeRate(
    fromToken?.symbol || '',
    toToken?.symbol || '',
  );

  // Get token balance using wagmi
  const { data: fromTokenBalance, isLoading: isFromBalanceLoading } =
    useBalance({
      address: address,
      token:
        fromToken?.symbol === 'ETH' ||
        !fromToken?.address ||
        fromToken?.address === ''
          ? undefined // undefined for native ETH balance
          : (fromToken?.address as `0x${string}`),
      chainId: chain?.id,
    });

  // Initialize from URL parameters
  useEffect(() => {
    if (Object.keys(availableTokens).length === 0) return;

    const queryPayTokenSymbol = searchParams.get('payToken');
    const queryReceiveTokenSymbol = searchParams.get('receiveToken');
    const queryPayAmount = searchParams.get('payAmount');

    if (queryPayTokenSymbol && availableTokens[queryPayTokenSymbol]) {
      const newFromToken = availableTokens[queryPayTokenSymbol];
      setFromToken(newFromToken);
      setTokens((prev) => ({
        ...prev,
        pay: {
          icon: newFromToken.icon || '/images/eth.svg',
          name: newFromToken.symbol || 'ETH',
        },
      }));
    }
    if (queryReceiveTokenSymbol && availableTokens[queryReceiveTokenSymbol]) {
      const newToToken = availableTokens[queryReceiveTokenSymbol];
      setToToken(newToToken);
      setTokens((prev) => ({
        ...prev,
        receive: {
          icon: newToToken.icon || '/images/usdt.svg',
          name: newToToken.symbol || 'USDT',
        },
      }));
    }
    if (queryPayAmount) {
      setFromAmount(queryPayAmount);
    }
  }, [searchParams, availableTokens]);

  // Calculate 'toAmount' when 'fromAmount' or tokens change
  useEffect(() => {
    if (
      fromToken &&
      toToken &&
      fromAmount &&
      exchangeRate &&
      !isCheckingSwapDetails
    ) {
      const payAmountNum = parseFloat(fromAmount);
      if (!isNaN(payAmountNum) && payAmountNum > 0) {
        const calculatedToAmount = (payAmountNum * exchangeRate).toFixed(
          toToken.decimals > 6 ? 6 : toToken.decimals,
        );
        setToAmount(calculatedToAmount);

        // Calculate minimum received based on slippage tolerance
        const slippageRate = 1 - slippageTolerance / 100;
        setMinReceived(
          (parseFloat(calculatedToAmount) * slippageRate).toFixed(
            toToken.decimals > 6 ? 6 : toToken.decimals,
          ),
        );

        // Calculate price impact (simplified version)
        const impact =
          Math.abs(
            1 -
              exchangeRate /
                (tokenPrices[fromToken.symbol] / tokenPrices[toToken.symbol] ||
                  1),
          ) * 100;
        if (impact < 1) setPriceImpact('Low');
        else if (impact < 3) setPriceImpact('Medium');
        else setPriceImpact('High');
      } else {
        setToAmount('');
        setMinReceived('0');
        setPriceImpact('Low');
      }
    } else if (!fromAmount) {
      setToAmount('');
      setMinReceived('0');
      setPriceImpact('Low');
    }
  }, [
    fromAmount,
    exchangeRate,
    fromToken,
    toToken,
    isCheckingSwapDetails,
    tokenPrices,
    slippageTolerance,
  ]);

  // Check if swap can proceed
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    if (!fromToken || !toToken) {
      setSwapProceedDetails({ canProceed: false, message: 'Select tokens' });
      setIsCheckingSwapDetails(false);
      return;
    }

    const numericFromAmount = parseFloat(fromAmount);
    if (isNaN(numericFromAmount) || numericFromAmount <= 0) {
      setSwapProceedDetails({ canProceed: false, message: 'Enter an amount' });
      setIsCheckingSwapDetails(false);
      return;
    }

    // Start checks
    setIsCheckingSwapDetails(true);

    const performChecks = async () => {
      try {
        if (isFromBalanceLoading) {
          return;
        }

        if (!fromTokenBalance) {
          setSwapProceedDetails({
            canProceed: false,
            message: 'Could not fetch balance',
          });
          setIsCheckingSwapDetails(false);
          return;
        }

        // Add balance check
        if (fromTokenBalance && fromAmount) {
          const fromAmountBigInt = parseUnits(fromAmount, fromToken.decimals);
          if (fromAmountBigInt > fromTokenBalance.value) {
            setSwapProceedDetails({
              canProceed: false,
              message: 'Insufficient balance',
            });
            setIsCheckingSwapDetails(false);
            return;
          }
        }

        // Check if token is native ETH (no approval needed)
        if (
          fromToken?.symbol === 'ETH' ||
          fromToken?.address === NATIVE_TOKEN_ADDRESS
        ) {
          setSwapProceedDetails({ canProceed: true, message: 'Swap' });
          setIsCheckingSwapDetails(false);
          return;
        }

        // Check if approval is needed
        if (!isApproved) {
          setSwapProceedDetails({ canProceed: true, message: 'Approve' });
          setIsCheckingSwapDetails(false);
          return;
        }

        setSwapProceedDetails({ canProceed: true, message: 'Swap' });
      } catch (error) {
        console.error('Error during swap checks:', error);
        setSwapProceedDetails({
          canProceed: false,
          message: 'Error during checks',
        });
      } finally {
        setIsCheckingSwapDetails(false);
      }
    };

    const checkTimeout = setTimeout(performChecks, 500);
    return () => clearTimeout(checkTimeout);
  }, [
    isConnected,
    fromToken,
    toToken,
    fromAmount,
    fromTokenBalance,
    isFromBalanceLoading,
    isApproved,
  ]);

  // Update UI when swap is pending or successful
  useEffect(() => {
    if (isSwapLoading || isApproving) {
      setIsExecutingSwap(true);
    } else {
      setIsExecutingSwap(false);
    }

    if (isSwapSuccess) {
      // Reset form after successful swap if needed
      setFromAmount('');
      setToAmount('');
    }
  }, [isSwapLoading, isSwapSuccess, isApproving]);

  // Debug approval process
  useEffect(() => {
    setApprovalDebugInfo(
      `Approval Status - isApproved: ${isApproved}, isApproving: ${isApproving}, Token: ${
        fromToken?.symbol
      }, Address: ${fromToken?.address?.substring(0, 10) || 'none'}...`,
    );
  }, [isApproved, isApproving, fromToken]);

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
        setToToken(fromToken); // Swap them
        setTokens((prev) => ({
          ...prev,
          receive: {
            icon: fromToken?.icon || '/images/eth.svg',
            name: fromToken?.symbol || 'ETH',
          },
        }));
      }
      setFromToken(selectedToken);
      setTokens((prev) => ({
        ...prev,
        pay: {
          icon: selectedToken.icon || '/images/eth.svg',
          name: selectedToken.symbol || 'TOKEN',
        },
      }));
    } else {
      if (fromToken?.symbol === selectedToken.symbol) {
        setFromToken(toToken); // Swap them
        setTokens((prev) => ({
          ...prev,
          pay: {
            icon: toToken?.icon || '/images/usdt.svg',
            name: toToken?.symbol || 'USDT',
          },
        }));
      }
      setToToken(selectedToken);
      setTokens((prev) => ({
        ...prev,
        receive: {
          icon: selectedToken.icon || '/images/usdt.svg',
          name: selectedToken.symbol || 'TOKEN',
        },
      }));
    }
    setModalOpen(false);
    setFromAmount(''); // Reset amounts on token change
    setToAmount('');
  };

  const handleSwapTokensAndAmounts = () => {
    // Swap tokens in the internal state
    const tempFromToken = fromToken;
    const tempToToken = toToken;

    setFromToken(tempToToken);
    setToToken(tempFromToken);

    // Also update the UI tokens display
    setTokens({
      pay: {
        icon: tempToToken?.icon || '/images/usdt.svg',
        name: tempToToken?.symbol || 'USDT',
      },
      receive: {
        icon: tempFromToken?.icon || '/images/eth.svg',
        name: tempFromToken?.symbol || 'ETH',
      },
    });

    setFromAmount(toAmount);
  };

  const executeTransaction = () => {
    try {
      console.log('Execute transaction called', {
        isApproved,
        action: isApproved ? 'swap' : 'approve',
        fromToken: fromToken?.symbol,
        toToken: toToken?.symbol,
        fromAmount,
      });

      if (!isApproved && fromToken?.symbol !== 'ETH') {
        console.log('Calling approve function...');
        // Make sure we're dealing with a token that needs approval (not ETH)
        if (fromToken?.address && fromToken.address !== NATIVE_TOKEN_ADDRESS) {
          // Log the parameters being sent
          console.log('Approval params:', {
            tokenAddress: fromToken.address,
            walletAddress: address,
            amount: fromAmount,
            decimals: fromToken.decimals,
          });

          // Call approve directly without await - this is important for the wallet to trigger
          if (approve) {
            approve();
            console.log('Approve function called successfully');
          } else {
            console.error('Approve function is not available');
          }
        } else {
          console.error('Cannot approve: invalid token address or native ETH');
        }
      } else {
        console.log('Calling executeSwap function...');
        if (executeSwap) {
          executeSwap();
          console.log('Swap function call initiated');
        } else {
          console.error('Swap function is not available');
        }
      }
    } catch (error) {
      console.error('Transaction execution error:', error);
    }
  };

  // Calculate formatted price for display
  const getFormattedPrice = () => {
    if (!fromToken || !toToken || !exchangeRate) return '...';
    return `1 ${fromToken.symbol} ≈ ${exchangeRate.toFixed(6)} ${
      toToken.symbol
    }`;
  };

  // Handle errors from contract interactions
  useEffect(() => {
    if (approvalError) {
      console.error('Approval Error:', approvalError);

      // Check specifically for user rejection
      if (isUserRejectionError(approvalError)) {
        console.log('User cancelled approval transaction');
        // Reset UI state without showing an error toast
        setIsExecutingSwap(false);
        setIsCheckingSwapDetails(false);
        // Optionally show a neutral toast
        showToast({
          type: 'info',
          title: 'Transaction Cancelled',
          message: 'You cancelled the token approval transaction.',
          duration: 3000,
        });
      } else {
        // Handle actual errors
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
      console.error('Swap Error:', swapError);

      // Check specifically for user rejection
      if (isUserRejectionError(swapError)) {
        console.log('User cancelled swap transaction');
        // Reset UI state without showing an error toast
        setIsExecutingSwap(false);
        setIsCheckingSwapDetails(false);
        // Optionally show a neutral toast
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
                  <Image src={tokens.pay.icon} alt="" width={24} height={24} />
                  <span>{tokens.pay.name}</span>
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
                  value={toAmount}
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
                    src={tokens.receive.icon}
                    alt=""
                    width={24}
                    height={24}
                  />
                  <span>{tokens.receive.name}</span>
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
                {minReceived} {toToken?.symbol}
              </div>
            </div>
            <div className="slippage">
              <div className="label">Price impact</div>
              <div className="value">{priceImpact}</div>
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
            isExecutingSwap={isExecutingSwap || isApproving || isSwapLoading}
            onProceed={executeTransaction}
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
