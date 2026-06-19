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
import { Transaction } from '@mysten/sui/transactions';
import { parseUnits } from 'viem';
import useExchangeRate from '@/hooks/useExchangeRates';
import apiService from '@/lib/api';
import { getTokenIcon, tokenList, TokenInfo } from '@/lib/tokens';
import { SwapCTAButton } from './cta-button';
import Image from 'next/image';
import {
  useTokenApproval,
  useSwapExecution,
  getDeadlineTimestamp,
} from '@/lib/SwapIntegration';
import { useToast } from '@/hooks/useToast';
import { usePrices } from '@/contexts/PriceContext';
import { Trash2 } from 'lucide-react';
import {
  createSwapExactInputTransaction,
  formatTokenUnits,
  getSwapAssetBySymbol,
  hasSwapPairConfig,
  normalizeSwapDeploymentConfig,
  parseIfaSwapError,
  parseDecimalAmount,
  quoteExactInput,
  SUI_SWAP_DEPLOYMENT,
  type SuiSwapDeployment,
  type SuiSwapQuote,
} from '@/lib/sui-swap';

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

type SwapMode = 'swap' | 'sweep';
type TokenField = 'from' | 'to';

type SweepExclusionReason =
  | 'Unsupported by IFÁ SWAP'
  | 'Temporarily disabled'
  | 'Already target asset'
  | 'No oracle pair'
  | 'Stale oracle price'
  | 'Above dust threshold'
  | 'Value below estimated gas cost'
  | 'Amount too small after quote'
  | 'Deployment config missing';

interface SweepAssetConfig {
  coinType: string;
  symbol: string;
  decimals: number;
  assetVaultId?: string;
  protocolFeeVaultId?: string;
  oracleAssetIndex?: string;
  enabled: boolean;
  hasOraclePair: boolean;
  staleOracle?: boolean;
  icon?: TokenInfo['icon'];
}

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
  estimatedUsd: number;
  estimatedUsdsui: number;
  lpFee: number;
  protocolFee: number;
  minAmountOut: number;
}

interface SweepExcludedAsset extends SweepWalletCoin {
  reason: SweepExclusionReason;
}

const TokenLogo = ({
  symbol,
  icon,
  size = 24,
}: {
  symbol?: string;
  icon?: TokenInfo['icon'];
  size?: number;
}) => {
  if (symbol?.toUpperCase() === 'SUI') {
    return <SuiIcon />;
  }

  return (
    <Image
      src={icon || getTokenIcon(symbol || '') || '/images/tokens/eth.svg'}
      alt=""
      width={size}
      height={size}
    />
  );
};

const SUI_COIN_TYPE = '0x2::sui::SUI';
const HIDDEN_SWAP_SYMBOLS = new Set(['ETH', 'USDT']);
const MIN_SWEEP_USD_VALUE = 0.01;
const ESTIMATED_GAS_PER_LEG_USD = 0.01;
const ESTIMATED_BASE_GAS_USD = 0.02;

const isVisibleSuiSwapAsset = (asset: { symbol: string; enabled: boolean }) =>
  asset.enabled && !HIDDEN_SWAP_SYMBOLS.has(asset.symbol.toUpperCase());

const getSweepAssetConfig = (coinType: string, symbol?: string) => {
  const normalizedSymbol = symbol?.toUpperCase();

  return SWEEP_SUPPORTED_ASSETS.find(
    (asset) =>
      asset.coinType === coinType ||
      (normalizedSymbol && asset.symbol.toUpperCase() === normalizedSymbol),
  );
};

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

const USDSUI: SweepAssetConfig = {
  coinType: process.env.NEXT_PUBLIC_USDSUI_COIN_TYPE || '0x...::coin::USDSUI',
  assetVaultId: process.env.NEXT_PUBLIC_USDSUI_ASSET_VAULT_ID || '0x...',
  protocolFeeVaultId:
    process.env.NEXT_PUBLIC_USDSUI_PROTOCOL_FEE_VAULT_ID || '0x...',
  decimals: 9,
  symbol: 'USDSui',
  enabled: true,
  hasOraclePair: true,
  icon: '/images/tokens/USDsui.png',
};

const SWEEP_SUPPORTED_ASSETS: SweepAssetConfig[] = [
  USDSUI,
  {
    coinType: SUI_COIN_TYPE,
    symbol: 'SUI',
    decimals: 9,
    assetVaultId: process.env.NEXT_PUBLIC_SUI_ASSET_VAULT_ID || '0x...',
    protocolFeeVaultId:
      process.env.NEXT_PUBLIC_SUI_PROTOCOL_FEE_VAULT_ID || '0x...',
    oracleAssetIndex: process.env.NEXT_PUBLIC_SUI_ORACLE_ASSET_INDEX || '0x...',
    enabled: true,
    hasOraclePair: true,
  },
  {
    coinType: '0x...::wal::WAL',
    symbol: 'WAL',
    decimals: 9,
    assetVaultId: process.env.NEXT_PUBLIC_WAL_ASSET_VAULT_ID || '0x...',
    protocolFeeVaultId:
      process.env.NEXT_PUBLIC_WAL_PROTOCOL_FEE_VAULT_ID || '0x...',
    oracleAssetIndex: process.env.NEXT_PUBLIC_WAL_ORACLE_ASSET_INDEX || '0x...',
    enabled: true,
    hasOraclePair: true,
    icon: '/images/networks/Wal.png',
  },
  {
    coinType: '0x...::cetus::CETUS',
    symbol: 'CETUS',
    decimals: 9,
    enabled: false,
    hasOraclePair: true,
  },
  {
    coinType: '0x...::turbo::TURBO',
    symbol: 'TURBO',
    decimals: 9,
    enabled: true,
    hasOraclePair: false,
  },
];

const sweepPreviewBalances: SweepWalletCoin[] = [
  {
    coinType: '0x...::cetus::CETUS',
    symbol: 'CETUS',
    balance: 1.25,
    rawBalance: BigInt(1250000000),
    decimals: 9,
    coinObjectIds: ['preview-cetus'],
  },
  {
    coinType: '0x...::turbo::TURBO',
    symbol: 'TURBO',
    balance: 156.78,
    rawBalance: BigInt(156780000000),
    decimals: 9,
    coinObjectIds: ['preview-turbo'],
  },
  {
    coinType: '0x...::brz::BRZ',
    symbol: 'BRZ',
    balance: 0.94,
    rawBalance: BigInt(940000),
    decimals: 6,
    coinObjectIds: ['preview-brz'],
    icon: tokenList.BRZ?.icon,
  },
  {
    coinType: USDSUI.coinType,
    symbol: USDSUI.symbol,
    balance: 0.18,
    rawBalance: BigInt(180000),
    decimals: USDSUI.decimals,
    coinObjectIds: ['preview-usdsui'],
    icon: USDSUI.icon,
  },
  {
    coinType: SUI_COIN_TYPE,
    symbol: 'SUI',
    balance: 0.003,
    rawBalance: BigInt(3000000),
    decimals: 9,
    coinObjectIds: ['preview-sui'],
  },
];

const formatSweepAmount = (value: number, maximumFractionDigits = 6) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
  });

const hasConfiguredObjectId = (value?: string) =>
  Boolean(value && value !== '0x...' && !value.includes('...'));

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
  const [sweepThreshold, setSweepThreshold] = useState('0.5');
  const [selectedSweepCoinTypes, setSelectedSweepCoinTypes] = useState<
    string[]
  >([]);
  const [walletSweepCoins, setWalletSweepCoins] = useState<SweepWalletCoin[]>(
    [],
  );
  const [isLoadingSweepCoins, setIsLoadingSweepCoins] = useState(false);
  const [swapDeployment, setSwapDeployment] = useState<SuiSwapDeployment>(
    SUI_SWAP_DEPLOYMENT,
  );
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
          error instanceof Error
            ? error.message
            : 'Unable to load swap deployment.',
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
    () =>
      swapDeployment.assets
        .filter(isVisibleSuiSwapAsset)
        .map(toSuiTokenInfo),
    [swapDeployment.assets],
  );

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
    } catch (error) {
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
      .getBalance({
        owner: suiAccount.address,
        coinType: suiFromAsset.coinType,
      })
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

    return () => {
      active = false;
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

    const getTokenBySymbol = (symbol: string | null) => {
      if (!symbol) return undefined;
      return tokenValues.find(
        (token) => token.symbol.toUpperCase() === symbol.toUpperCase(),
      );
    };

    const nextFromToken =
      getTokenBySymbol(searchParams.get('payToken')) ||
      getTokenBySymbol('SUI') ||
      tokenValues[0];
    const fallbackToToken =
      (getTokenBySymbol('USDSui')?.symbol !== nextFromToken?.symbol
        ? getTokenBySymbol('USDSui')
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

    if (suiSwapQuote && suiToAsset) {
      const quotedAmount = formatTokenUnits(
        suiSwapQuote.amountOut,
        suiToAsset.decimals,
      );
      const minAmountOut =
        (suiSwapQuote.amountOut * (BigInt(10000) - slippageBps)) /
        BigInt(10000);

      return {
        toAmount: quotedAmount,
        minReceived: formatTokenUnits(minAmountOut, suiToAsset.decimals),
        priceImpact: 'Oracle',
      };
    }

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
    slippageBps,
    suiSwapQuote,
    suiToAsset,
    toToken,
    tokenPrices,
  ]);

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
          balances.map(async (balance) => {
            const metadata = await suiClient
              .getCoinMetadata({ coinType: balance.coinType })
              .catch(() => null);
            const symbol =
              metadata?.symbol || balance.coinType.split('::').pop() || 'TOKEN';
            const config = getSweepAssetConfig(balance.coinType, symbol);
            const decimals = metadata?.decimals ?? config?.decimals ?? 9;
            const rawBalance = BigInt(balance.totalBalance);
            const displayBalance =
              Number(rawBalance) / Number(BigInt(10) ** BigInt(decimals));
            const coinObjects = await suiClient
              .getCoins({
                owner: suiAccount.address,
                coinType: balance.coinType,
              })
              .catch(() => ({ data: [] }));

            return {
              coinType: balance.coinType,
              symbol: config?.symbol || symbol,
              balance: displayBalance,
              rawBalance,
              decimals,
              coinObjectIds: coinObjects.data.map((coin) => coin.coinObjectId),
              icon: config?.icon || getTokenIcon(config?.symbol || symbol),
            };
          }),
        );

        if (active) setWalletSweepCoins(coins);
      } catch (error) {
        if (active) setWalletSweepCoins([]);
      } finally {
        if (active) setIsLoadingSweepCoins(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [suiAccount?.address, suiClient]);

  const sweepWalletCoins = useMemo(
    () => (walletSweepCoins.length > 0 ? walletSweepCoins : sweepPreviewBalances),
    [walletSweepCoins],
  );

  const sweepPreview = useMemo(() => {
    const numericThreshold = parseFloat(sweepThreshold);
    const threshold = Number.isFinite(numericThreshold) ? numericThreshold : 0;
    const included: SweepIncludedAsset[] = [];
    const excluded: SweepExcludedAsset[] = [];

    sweepWalletCoins.forEach((coin) => {
      const config = getSweepAssetConfig(coin.coinType, coin.symbol);
      const coinWithIcon = {
        ...coin,
        icon: coin.icon || config?.icon || getTokenIcon(coin.symbol),
      };
      const estimatedUsd =
        coin.symbol === USDSUI.symbol
          ? coin.balance
          : coin.balance * (tokenPrices[coin.symbol] || 1);

      const exclude = (reason: SweepExclusionReason) => {
        excluded.push({ ...coinWithIcon, reason });
      };

      if (!config) {
        exclude('Unsupported by IFÁ SWAP');
        return;
      }

      if (config.coinType === USDSUI.coinType) {
        exclude('Already target asset');
        return;
      }

      if (!config.enabled) {
        exclude('Temporarily disabled');
        return;
      }

      if (!config.hasOraclePair) {
        exclude('No oracle pair');
        return;
      }

      if (config.staleOracle) {
        exclude('Stale oracle price');
        return;
      }

      if (estimatedUsd <= 0 || estimatedUsd < MIN_SWEEP_USD_VALUE) {
        exclude('Amount too small after quote');
        return;
      }

      if (estimatedUsd > threshold) {
        exclude('Above dust threshold');
        return;
      }

      if (estimatedUsd < ESTIMATED_GAS_PER_LEG_USD) {
        exclude('Value below estimated gas cost');
        return;
      }

      const lpFee = estimatedUsd * 0.002;
      const protocolFee = estimatedUsd * 0.001;
      const estimatedUsdsui = Math.max(estimatedUsd - lpFee - protocolFee, 0);
      const minAmountOut =
        estimatedUsdsui * (1 - slippageTolerance / 100);

      included.push({
        ...coinWithIcon,
        estimatedUsd,
        estimatedUsdsui,
        lpFee,
        protocolFee,
        minAmountOut,
      });
    });

    return { included, excluded };
  }, [slippageTolerance, sweepThreshold, sweepWalletCoins, tokenPrices]);

  const selectedSweepCoinTypeSet = useMemo(
    () => new Set(selectedSweepCoinTypes),
    [selectedSweepCoinTypes],
  );

  const selectedSweepAssets = useMemo(
    () =>
      sweepPreview.included.filter((asset) =>
        selectedSweepCoinTypeSet.has(asset.coinType),
      ),
    [selectedSweepCoinTypeSet, sweepPreview.included],
  );

  const selectedSweepValue = useMemo(
    () =>
      selectedSweepAssets.reduce(
        (total, asset) => total + asset.estimatedUsd,
        0,
      ),
    [selectedSweepAssets],
  );

  const selectedSweepReceived = useMemo(
    () =>
      selectedSweepAssets.reduce(
        (total, asset) => total + asset.estimatedUsdsui,
        0,
      ),
    [selectedSweepAssets],
  );

  const estimatedSweepGas =
    ESTIMATED_BASE_GAS_USD +
    selectedSweepAssets.length * ESTIMATED_GAS_PER_LEG_USD;

  const selectedSweepConfigsReady = selectedSweepAssets.every((asset) => {
    const config = SWEEP_SUPPORTED_ASSETS.find(
      (supportedAsset) => supportedAsset.coinType === asset.coinType,
    );

    return (
      hasConfiguredObjectId(config?.assetVaultId) &&
      hasConfiguredObjectId(config?.protocolFeeVaultId) &&
      hasConfiguredObjectId(config?.oracleAssetIndex)
    );
  });

  const sweepTargetReady =
    USDSUI.enabled &&
    hasConfiguredObjectId(USDSUI.assetVaultId) &&
    hasConfiguredObjectId(USDSUI.protocolFeeVaultId);

  const canExecuteSweep =
    isSuiConnected &&
    selectedSweepAssets.length > 0 &&
    sweepTargetReady &&
    selectedSweepConfigsReady;

  const sweepButtonLabel = (() => {
    if (!isSuiConnected) return 'Connect wallet';
    if (isLoadingSweepCoins) return 'Loading balances';
    if (selectedSweepAssets.length === 0) return 'Select sweep legs';
    if (!sweepTargetReady || !selectedSweepConfigsReady)
      return 'Deployment config missing';
    return `Sweep ${selectedSweepAssets.length} Token${
      selectedSweepAssets.length === 1 ? '' : 's'
    }`;
  })();

  const allIncludedSweepSelected =
    sweepPreview.included.length > 0 &&
    sweepPreview.included.every((asset) =>
      selectedSweepCoinTypeSet.has(asset.coinType),
    );

  const isCheckingSwapDetails =
    isSuiConnected &&
    Boolean(fromToken) &&
    Boolean(toToken) &&
    parseFloat(fromAmount) > 0 &&
    (isSuiBalanceLoading || isSuiQuoteLoading || isSwapDeploymentLoading);

  const swapProceedDetails = useMemo(() => {
    if (!fromToken || !toToken) {
      return { canProceed: false, message: 'Select tokens' };
    }

    const numericFromAmount = parseFloat(fromAmount);
    if (isNaN(numericFromAmount) || numericFromAmount <= 0) {
      return { canProceed: false, message: 'Enter an amount' };
    }

    if (!isSuiConnected) {
      return { canProceed: false, message: 'Connect wallet' };
    }

    if (isSwapDeploymentLoading) {
      return { canProceed: false, message: 'Loading config' };
    }

    if (swapDeploymentError) {
      return { canProceed: false, message: 'Config unavailable' };
    }

    if (!suiFromAsset || !suiToAsset) {
      return { canProceed: false, message: 'Unsupported pair' };
    }

    if (suiFromAsset.coinType === suiToAsset.coinType) {
      return { canProceed: false, message: 'Select different tokens' };
    }

    if (!suiSwapConfigReady) {
      return { canProceed: false, message: 'Deployment config missing' };
    }

    if (isSuiBalanceLoading || isSuiQuoteLoading) {
      return { canProceed: false, message: 'Checking balance' };
    }

    if (suiFromBalance === null) {
      return { canProceed: false, message: 'Could not fetch balance' };
    }

    if (amountInBaseUnits <= BigInt(0)) {
      return { canProceed: false, message: 'Enter a valid amount' };
    }

    if (amountInBaseUnits > suiFromBalance) {
      return { canProceed: false, message: 'Insufficient balance' };
    }

    if (suiQuoteError) {
      return { canProceed: false, message: 'Quote unavailable' };
    }

    if (!suiSwapQuote || suiSwapQuote.amountOut <= BigInt(0)) {
      return { canProceed: false, message: 'Quote unavailable' };
    }

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

  const handleSweepThresholdChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
      setSweepThreshold(value);
    }
  };

  const openTokenSelectionModal = (field: TokenField) => {
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

  const handleSweepAssetToggle = (coinType: string) => {
    setSelectedSweepCoinTypes((currentCoinTypes) =>
      currentCoinTypes.includes(coinType)
        ? currentCoinTypes.filter((currentCoinType) => currentCoinType !== coinType)
        : [...currentCoinTypes, coinType],
    );
  };

  const handleSelectAllSweepAssets = () => {
    if (allIncludedSweepSelected) {
      setSelectedSweepCoinTypes([]);
      return;
    }

    setSelectedSweepCoinTypes(
      sweepPreview.included.map((asset) => asset.coinType),
    );
  };

  const handleSwapTokensAndAmounts = () => {
    const tempFromToken = fromToken;
    const tempToToken = toToken;

    setFromToken(tempToToken);
    setToToken(tempFromToken);
    setFromAmount(swapQuote.toAmount);
  };

  const executeTransaction = async () => {
    try {
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

      const signTransactionFeature =
        currentWallet?.features['sui:signTransaction'];
      if (!signTransactionFeature) {
        throw new Error(
          'Connected wallet does not support the modern sui:signTransaction API. Update the wallet extension or try another Sui wallet.',
        );
      }

      setIsExecutingSuiSwap(true);

      const minAmountOut =
        (suiSwapQuote.amountOut * (BigInt(10000) - slippageBps)) /
        BigInt(10000);
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

      const transactionBytes = await tx.build({ client: suiClient });
      const resolvedTx = Transaction.from(transactionBytes);
      const transactionJson = await resolvedTx.toJSON();
      const chainId = suiAccount.chains?.[0] || 'sui:testnet';

      const { bytes, signature } = await signTransactionFeature.signTransaction({
        transaction: {
          toJSON: async () => transactionJson,
        },
        account: suiAccount,
        chain: chainId,
      });

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showBalanceChanges: true,
        },
      });

      showToast({
        type: 'success',
        title: 'Swap Submitted',
        message: `Swapped ${fromAmount} ${suiFromAsset.symbol} to ${suiToAsset.symbol}. Digest: ${result.digest.slice(0, 10)}...`,
        duration: 7000,
      });
      setFromAmount('');
      setSuiSwapQuote(null);
    } catch (error) {
      showToast({
        type: isUserRejectionError(error) ? 'info' : 'error',
        title: isUserRejectionError(error)
          ? 'Transaction Cancelled'
          : 'Swap Failed',
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

  const executeSweep = () => {
    if (!canExecuteSweep) {
      showToast({
        type: 'info',
        title: 'Sweep Not Ready',
        message:
          sweepButtonLabel === 'Deployment config missing'
            ? 'Add the IFÁ SWAP package, vault, oracle, and USDSui object IDs before submitting a sweep PTB.'
            : sweepButtonLabel,
        duration: 5000,
      });
      return;
    }

    showToast({
      type: 'info',
      title: 'Sweep PTB Ready',
      message: `Prepared ${selectedSweepAssets.length} typed sweep leg${
        selectedSweepAssets.length === 1 ? '' : 's'
      } into ${USDSUI.symbol}.`,
      duration: 4000,
    });
  };

  // Calculate formatted price for display
  const getFormattedPrice = () => {
    if (
      suiSwapQuote &&
      suiFromAsset &&
      suiToAsset &&
      amountInBaseUnits > BigInt(0)
    ) {
      const inputUnit = BigInt(10) ** BigInt(suiFromAsset.decimals);
      const quotedPerUnit =
        (suiSwapQuote.amountOut * inputUnit) / amountInBaseUnits;

      return `1 ${suiFromAsset.symbol} ≈ ${formatTokenUnits(
        quotedPerUnit,
        suiToAsset.decimals,
      )} ${suiToAsset.symbol}`;
    }

    if (!fromToken || !toToken || !exchangeRate) return '...';
    return `1 ${fromToken.symbol} ≈ ${exchangeRate.toFixed(6)} ${
      toToken.symbol
    }`;
  };

  const payTokenDisplay = {
    icon: fromToken?.icon || '/images/tokens/eth.svg',
    name: fromToken?.symbol || 'SUI',
  };
  const receiveTokenDisplay = {
    icon: toToken?.icon || '/images/tokens/USDsui.png',
    name: toToken?.symbol || 'USDSui',
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
                      onChange={handleSweepThresholdChange}
                    />
                  </div>
                </div>

                <div className="swap-input sweep-input">
                  <div className="swap-form">
                    <label>Target Asset</label>
                    <div className="sweep-fixed-target">
                      <span>{USDSUI.symbol}</span>
                      <small>Fixed for V1</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sweep-divider" />

              <div className="sweep-list-header">
                <span>
                  Included Assets ({sweepPreview.included.length} legs)
                </span>
                <button type="button" onClick={handleSelectAllSweepAssets}>
                  {allIncludedSweepSelected ? 'Clear All' : 'Select All'}
                </button>
              </div>

              <div className="sweep-token-list">
                {sweepPreview.included.length > 0 ? (
                  sweepPreview.included.map((asset) => (
                    <label className="sweep-token-row" key={asset.coinType}>
                      <input
                        type="checkbox"
                        checked={selectedSweepCoinTypeSet.has(asset.coinType)}
                        onChange={() => handleSweepAssetToggle(asset.coinType)}
                      />
                      <span className="sweep-checkbox" />
                      <span className="sweep-token-icon">
                        <TokenLogo
                          symbol={asset.symbol}
                          icon={asset.icon}
                          size={28}
                        />
                      </span>
                      <span className="sweep-token-meta">
                        <span className="sweep-token-title">
                          {asset.symbol}
                          <span>${asset.estimatedUsd.toFixed(2)}</span>
                        </span>
                        <span>{formatSweepAmount(asset.balance)} tokens</span>
                        <span>
                          Est. out {formatSweepAmount(asset.estimatedUsdsui)}{' '}
                          {USDSUI.symbol}
                        </span>
                        <span>
                          LP ${asset.lpFee.toFixed(4)} · Protocol $
                          {asset.protocolFee.toFixed(4)} · Min{' '}
                          {formatSweepAmount(asset.minAmountOut)}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="sweep-empty-row">
                    {isLoadingSweepCoins
                      ? 'Loading wallet balances...'
                      : 'No eligible sweep legs'}
                  </div>
                )}
              </div>

              <div className="sweep-list-header sweep-excluded-header">
                <span>
                  Excluded Assets ({sweepPreview.excluded.length} tokens)
                </span>
              </div>

              <div className="sweep-token-list sweep-excluded-list">
                {sweepPreview.excluded.length > 0 ? (
                  sweepPreview.excluded.map((asset) => (
                    <div className="sweep-token-row excluded" key={asset.coinType}>
                      <span className="sweep-status-dot" />
                      <span className="sweep-token-icon">
                        <TokenLogo
                          symbol={asset.symbol}
                          icon={asset.icon}
                          size={28}
                        />
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
                    {formatSweepAmount(selectedSweepReceived)} {USDSUI.symbol}
                  </div>
                </div>
                <div className="slippage">
                  <div className="label">Slippage</div>
                  <div className="value">
                    {(slippageTolerance * 100).toFixed(0)} bps
                  </div>
                </div>
                <div className="slippage">
                  <div className="label">Estimated Gas</div>
                  <div className="value">
                    ${estimatedSweepGas.toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sweep-cta"
                disabled={!canExecuteSweep}
                onClick={executeSweep}
              >
                <Trash2 size={20} />
                <span>{sweepButtonLabel}</span>
              </button>

              <p className="sweep-note">
                All swaps executed atomically · Reverts if any leg fails
              </p>
            </div>
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
