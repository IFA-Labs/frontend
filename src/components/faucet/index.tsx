'use client';
import { StaticImageData } from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TokenIcon } from '@/lib/token-icons';
import WalIcon from '../../../public/images/networks/Wal.png';
import CngnIcon from '../../../public/images/tokens/CNGN.png';
import UsdSuiIcon from '../../../public/images/tokens/USDsui.png';
import ZarpIcon from '../../../public/images/tokens/zarp.svg';
import { Transaction } from '@mysten/sui/transactions';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
  useSuiClientContext,
} from '@mysten/dapp-kit';
import { isValidSuiAddress } from '@mysten/sui/utils';
import {
  FaucetDeployment,
  FaucetTokenConfig,
  FaucetTokenState,
  createClaimTransaction,
  formatCooldown,
  formatTokenAmount,
  getFaucetAccountState,
  getSupportedTokenKeys,
  getFaucetTokenState,
  normalizeSuiTokenType,
  parseFaucetError,
  preflightClaimTransaction,
} from '@/lib/sui-faucet';

const DEFAULT_NETWORK = 'testnet';

const STATS = [
  { value: 'SUI', label: 'NETWORK' },
  { value: '24h', label: 'DEFAULT COOLDOWN' },
  { value: '0x6', label: 'CLOCK' },
];

interface DropdownOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
}

interface PanelCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

const truncate = (value: string, left = 6, right = 4) =>
  value.length > left + right
    ? `${value.slice(0, left)}...${value.slice(-right)}`
    : value;

// Local fallbacks for tokens not available in @web3icons/react.
const localTokenIcons: Record<string, StaticImageData | string> = {
  WAL: WalIcon,
  CNGN: CngnIcon,
  USDSUI: UsdSuiIcon,
  ZARP: ZarpIcon,
};

const AssetIcon = ({
  symbol,
  icon,
  size = 24,
}: {
  symbol: string;
  icon?: StaticImageData | string;
  size?: number;
}) => (
  <TokenIcon
    symbol={symbol}
    icon={localTokenIcons[symbol.toUpperCase()] ?? icon}
    size={size}
  />
);

const FaucetDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  id,
}: {
  options: DropdownOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  id: string;
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [opensUp, setOpensUp] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', keyDownHandler);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedPanelHeight = Math.min(options.length * 48 + 8, 280);
      const up = window.innerHeight - rect.bottom < estimatedPanelHeight + 8;

      setOpensUp(up);
      setCoords({
        left: rect.left,
        width: rect.width,
        ...(up
          ? { bottom: window.innerHeight - rect.top }
          : { top: rect.bottom }),
      });
    }
    setOpen(true);
  };

  return (
    <>
      <div
        className={`faucet-dropdown ${open ? 'open' : ''}`}
        ref={wrapRef}
        id={id}
      >
        <button
          ref={triggerRef}
          type="button"
          className="faucet-dropdown-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={handleToggle}
        >
          <span className="dropdown-trigger-icon">{selected?.icon}</span>
          <span className="dropdown-trigger-label">
            {selected ? (
              <>
                <span className="dropdown-main-label">{selected.label}</span>
                {selected.sublabel && (
                  <span className="dropdown-sub-label">
                    {selected.sublabel}
                  </span>
                )}
              </>
            ) : (
              <span className="dropdown-placeholder">{placeholder}</span>
            )}
          </span>
          <span className={`dropdown-chevron ${open ? 'rotated' : ''}`}>⌄</span>
        </button>
      </div>

      {open && (
        <div
          ref={panelRef}
          className={`faucet-dropdown-panel ${opensUp ? 'opens-up' : ''}`}
          role="listbox"
          style={{
            position: 'fixed',
            left: coords.left,
            width: coords.width,
            ...(opensUp ? { bottom: coords.bottom } : { top: coords.top }),
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={value === option.id}
              className={`dropdown-option ${value === option.id ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span className="dropdown-option-icon">{option.icon}</span>
              <span className="dropdown-option-info">
                <span className="dropdown-option-label">{option.label}</span>
                {option.sublabel && (
                  <span className="dropdown-option-sub">{option.sublabel}</span>
                )}
              </span>
              {value === option.id && <span className="dropdown-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const SlideVerify = ({ onVerified }: { onVerified: () => void }) => {
  const [verified, setVerified] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const handleMove = (clientX: number) => {
    if (!trackRef.current) return;
    const maxTravel = trackRef.current.clientWidth - 44;
    const pct = Math.min(
      Math.max((clientX - startXRef.current) / maxTravel, 0),
      1,
    );
    setProgress(pct);

    if (pct >= 0.95) {
      setVerified(true);
      setDragging(false);
      setProgress(1);
      onVerified();
    }
  };

  const handleUp = () => {
    if (!verified) setProgress(0);
    setDragging(false);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (event: MouseEvent) => handleMove(event.clientX);
    const onTouchMove = (event: TouchEvent) =>
      handleMove(event.touches[0].clientX);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging]);

  return (
    <div
      className={`slide-verify ${verified ? 'verified' : ''}`}
      ref={trackRef}
    >
      <div className="slide-fill" style={{ width: `${progress * 100}%` }} />
      <div
        className="slide-handle"
        style={{ left: `calc(${progress * 100}% - ${progress * 44}px)` }}
        onMouseDown={(event) => {
          if (!verified) {
            setDragging(true);
            startXRef.current = event.clientX;
          }
        }}
        onTouchStart={(event) => {
          if (!verified) {
            setDragging(true);
            startXRef.current = event.touches[0].clientX;
          }
        }}
        role="slider"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Slide to verify"
      >
        {verified ? '✓' : '›'}
      </div>
      {!dragging && !verified && (
        <span className="slide-label">Slide to verify</span>
      )}
      {verified && <span className="slide-label verified-label">Verified</span>}
    </div>
  );
};

const Faucet = () => {
  const suiClient = useSuiClient();
  const suiContext = useSuiClientContext();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();

  const selectedNetwork = DEFAULT_NETWORK;
  const [deployment, setDeployment] = useState<FaucetDeployment | null>(null);
  const [deploymentError, setDeploymentError] = useState('');
  const [selectedTokenType, setSelectedTokenType] = useState('');
  const [supportedTokenTypes, setSupportedTokenTypes] = useState<string[]>([]);
  const [tokenStates, setTokenStates] = useState<
    Record<string, FaucetTokenState>
  >({});
  const [verified, setVerified] = useState(false);
  const [tokenState, setTokenState] = useState<FaucetTokenState | null>(null);
  const [remainingCooldownMs, setRemainingCooldownMs] = useState<bigint>(
    BigInt(0),
  );
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [canClaimOnChain, setCanClaimOnChain] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [stateLoading, setStateLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    if (suiContext.network !== selectedNetwork) {
      suiContext.selectNetwork(selectedNetwork);
    }
  }, [selectedNetwork, suiContext]);

  useEffect(() => {
    let active = true;
    setDataLoading(true);
    setDeploymentError('');
    setDeployment(null);
    setTokenState(null);
    setSupportedTokenTypes([]);
    setTokenStates({});

    fetch(
      `/api/faucet/deployment?network=${encodeURIComponent(selectedNetwork)}`,
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || 'Unable to load deployment.');
        return body as FaucetDeployment;
      })
      .then((config) => {
        if (!active) return;
        setDeployment(config);
        const configuredTokenTypes = config.tokens.map((token) =>
          normalizeSuiTokenType(token.tokenType),
        );
        setSupportedTokenTypes(configuredTokenTypes);
        setSelectedTokenType(configuredTokenTypes[0] || '');
      })
      .catch((error) => {
        if (!active) return;
        setDeploymentError(parseFaucetError(error));
        setSelectedTokenType('');
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedNetwork]);

  useEffect(() => {
    if (!deployment) return;

    let active = true;

    (async () => {
      try {
        const registryTokenTypes = await getSupportedTokenKeys({
          client: suiClient,
          deployment,
          sender: account?.address,
        });
        if (!active) return;

        const mergedTokenTypes = Array.from(
          new Set([
            ...deployment.tokens.map((token) =>
              normalizeSuiTokenType(token.tokenType),
            ),
            ...registryTokenTypes,
          ]),
        );
        setSupportedTokenTypes(mergedTokenTypes);
        setSelectedTokenType((current) => current || mergedTokenTypes[0] || '');

        const states = await Promise.allSettled(
          mergedTokenTypes.map(async (tokenType) => {
            const state = await getFaucetTokenState({
              client: suiClient,
              deployment,
              tokenType,
              sender: account?.address,
            });
            return [tokenType, state] as const;
          }),
        );

        if (!active) return;
        setTokenStates((current) => {
          const next = { ...current };
          for (const result of states) {
            if (result.status === 'fulfilled') {
              next[result.value[0]] = result.value[1];
            }
          }
          return next;
        });
      } catch (error) {
        if (!active) return;
        setClaimError(parseFaucetError(error));
      }
    })();

    return () => {
      active = false;
    };
  }, [account?.address, deployment, suiClient]);

  const selectedToken = useMemo<FaucetTokenConfig | undefined>(
    () =>
      deployment?.tokens.find(
        (token) => normalizeSuiTokenType(token.tokenType) === selectedTokenType,
      ),
    [deployment, selectedTokenType],
  );

  const recipientIsValid = Boolean(account?.address);

  const refreshFaucetState = async (signal?: { cancelled: boolean }) => {
    if (!deployment || !selectedTokenType) return;

    setStateLoading(true);
    setClaimError('');

    try {
      const state = await getFaucetTokenState({
        client: suiClient,
        deployment,
        tokenType: selectedTokenType,
        sender: account?.address,
      });
      if (signal?.cancelled) return;
      setTokenState(state);
      setTokenStates((current) => ({
        ...current,
        [selectedTokenType]: state,
      }));

      if (account?.address) {
        const accountState = await getFaucetAccountState({
          client: suiClient,
          deployment,
          tokenType: selectedTokenType,
          account: account.address,
          recipient: account.address,
        });
        if (signal?.cancelled) return;
        setRemainingCooldownMs(accountState.remainingCooldownMs);
        setCanClaimOnChain(accountState.canClaim);
        setIsBlacklisted(accountState.isBlacklisted);
        setWalletBalance(accountState.walletBalance);
      } else {
        if (signal?.cancelled) return;
        setRemainingCooldownMs(BigInt(0));
        setCanClaimOnChain(false);
        setIsBlacklisted(false);
        setWalletBalance(BigInt(0));
      }
    } catch (error) {
      if (signal?.cancelled) return;
      setClaimError(parseFaucetError(error));
    } finally {
      if (!signal?.cancelled) setStateLoading(false);
    }
  };

  useEffect(() => {
    const signal = { cancelled: false };
    refreshFaucetState(signal);
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment, selectedTokenType, account?.address]);

  const assetOptions: DropdownOption[] = supportedTokenTypes.map(
    (tokenType) => {
      const configuredToken = deployment?.tokens.find(
        (token) => normalizeSuiTokenType(token.tokenType) === tokenType,
      );
      const discoveredState = tokenStates[tokenType];
      const symbol =
        discoveredState?.metadata.symbol ||
        configuredToken?.symbol ||
        truncate(tokenType, 6, 4);
      const iconUrl =
        discoveredState?.metadata.iconUrl || configuredToken?.iconUrl;
      const isOfficial =
        discoveredState?.metadata.isOfficial ||
        configuredToken?.isOfficial ||
        false;

      return {
        id: tokenType,
        label: symbol,
        sublabel: isOfficial
          ? 'official faucet token'
          : truncate(tokenType, 10, 6),
        icon: <AssetIcon symbol={symbol} icon={iconUrl} size={22} />,
      };
    },
  );

  const claimAmount = tokenState
    ? formatTokenAmount(tokenState.claimAmount, tokenState.metadata.decimals)
    : selectedToken
      ? formatTokenAmount(
          BigInt(selectedToken.claimAmount),
          selectedToken.decimals,
        )
      : '...';
  const symbol =
    tokenState?.metadata.symbol || selectedToken?.symbol || 'tokens';
  const faucetBalance = tokenState
    ? `${formatTokenAmount(tokenState.balance, tokenState.metadata.decimals)} ${symbol}`
    : '...';

  const buttonLabel = (() => {
    if (!account?.address) return 'Connect wallet';
    if (!deployment) return 'Deployment missing';
    if (!selectedTokenType) return 'No token configured';
    if (stateLoading && !tokenState) return 'Loading...';
    if (tokenState?.paused) return 'Faucet paused';
    if (tokenState && tokenState.balance < tokenState.claimAmount)
      return 'Faucet empty';
    if (isBlacklisted) return 'Address blacklisted';
    if (remainingCooldownMs > BigInt(0))
      return `Cooling down — ${formatCooldown(remainingCooldownMs)}`;
    if (!verified) return 'Verify first';
    return `Claim ${claimAmount} ${symbol}`;
  })();

  const tokenReady =
    tokenState !== null &&
    !tokenState.paused &&
    tokenState.balance >= tokenState.claimAmount;

  const canClaim =
    Boolean(account?.address) &&
    Boolean(deployment) &&
    Boolean(selectedTokenType) &&
    verified &&
    tokenReady &&
    !isBlacklisted &&
    remainingCooldownMs === BigInt(0) &&
    canClaimOnChain;

  const handleClaim = async () => {
    if (!canClaim || !deployment || !account?.address) return;

    setClaiming(true);
    setClaimError('');

    try {
      const chain = `sui:${selectedNetwork}`;
      const supportedChains = account.chains ?? [];

      if (
        supportedChains.length > 0 &&
        !supportedChains.includes(chain) &&
        !supportedChains.includes('sui:unknown')
      ) {
        throw new Error('Switch your Sui wallet to Testnet and reconnect.');
      }

      await preflightClaimTransaction({
        client: suiClient,
        deployment,
        tokenType: selectedTokenType,
        recipient: account.address,
        sender: account.address,
      });

      const tx = createClaimTransaction({
        deployment,
        tokenType: selectedTokenType,
        recipient: account.address,
      });
      tx.setSenderIfNotSet(account.address);

      const txData = tx.getData();
      if (txData.commands.length === 0) {
        throw new Error('Claim transaction is empty. Please refresh and try again.');
      }

      const signTransactionFeature = currentWallet?.features['sui:signTransaction'];
      if (!signTransactionFeature) {
        throw new Error(
          'Connected wallet does not support the modern sui:signTransaction API. Update the wallet extension or try another Sui wallet.',
        );
      }

      const transactionBytes = await tx.build({ client: suiClient });
      const resolvedTx = Transaction.from(transactionBytes);
      const transactionJson = await resolvedTx.toJSON();

      console.info('[faucet:claim]', {
        wallet: currentWallet.name,
        walletFeatures: Object.keys(currentWallet.features),
        commandCount: txData.commands.length,
        inputCount: txData.inputs.length,
        transactionJsonLength: transactionJson.length,
        transactionByteLength: transactionBytes.length,
        tokenType: selectedTokenType,
      });

      const { bytes, signature } = await signTransactionFeature.signTransaction({
        transaction: {
          toJSON: async () => transactionJson,
        },
        account,
        chain,
      });

      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true },
      });
      setVerified(false);
      await refreshFaucetState();
    } catch (error) {
      setClaimError(parseFaucetError(error));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <section className="faucet-page">
      <div className="faucet-blob faucet-blob-right" aria-hidden />

      <div className="faucet-shell">
        <div className="faucet-hero">
          <div className="faucet-live-badge">
            <span className="live-dot" />
            Sui Faucet — Live
          </div>
          <h1 className="faucet-headline">
            Claim <br />
            <span>test tokens</span>
          </h1>
          <p className="faucet-description">
            Get started with Sui testnet tokens for development and testing.
          </p>
        </div>

        <div className="faucet-widget">
          <div className="faucet-form">
            <div className="faucet-section">
              <div className="section-header">
                <span className="section-label">ASSET</span>
                <span className="section-hint">claim = {claimAmount}</span>
              </div>
              {dataLoading ? (
                <div className="faucet-select-skeleton" />
              ) : assetOptions.length === 0 ? (
                <div className="faucet-select-empty">
                  {deploymentError || 'No faucet tokens configured'}
                </div>
              ) : (
                <FaucetDropdown
                  id="faucet-asset-select"
                  options={assetOptions}
                  value={selectedTokenType}
                  onChange={setSelectedTokenType}
                  placeholder="Select asset"
                />
              )}
            </div>

            <div className="faucet-status-grid">
              {/* <div>
                <span>Faucet</span>
                <strong>{stateLoading ? 'Loading...' : faucetBalance}</strong>
              </div> */}
              <div>
                <span>Cooldown</span>
                <strong>{formatCooldown(remainingCooldownMs)}</strong>
              </div>
              <div>
                <span>Your balance</span>
                <strong>
                  {tokenState
                    ? `${formatTokenAmount(walletBalance, tokenState.metadata.decimals)} ${symbol}`
                    : '...'}
                </strong>
              </div>
            </div>

            <div className="faucet-section">
              <div className="section-header">
                <span className="section-label">VERIFY</span>
                <span className="section-hint">bot-check</span>
              </div>
              <SlideVerify onVerified={() => setVerified(true)} />
            </div>

            {claimError && <div className="faucet-error">{claimError}</div>}

            <button
              type="button"
              id="faucet-request-btn"
              className={`faucet-request-btn ${canClaim ? 'enabled' : ''} ${
                claiming ? 'loading' : ''
              }`}
              onClick={handleClaim}
              disabled={!canClaim || claiming}
            >
              {claiming ? (
                <>
                  <span className="btn-spinner" />
                  Claiming...
                </>
              ) : (
                buttonLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Faucet;
