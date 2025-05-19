'use client';

import {
  useAccount,
  useDisconnect,
  useConnect as useWagmiConnect,
  useBalance,
} from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useEffect, useState } from 'react';
import './style.scss';

export function ConnectWallet() {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { status: connectStatus, error: connectError } = useWagmiConnect();
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useBalance({
    address,
  });
  const appKit = useAppKit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnectClick = () => {
    if (appKit?.open) {
      appKit.open();
    } else {
      console.error(
        'AppKit modal control is not available. Ensure ContextProvider is set up.',
      );
    }
  };

  const networkIcons: Record<number, string> = {
    1: '/images/networks/ethereum.svg',
    11155111: '/images/networks/sepolia.svg',
    8453: '/images/networks/base.svg',
    84532: '/images/networks/base-sepolia.svg',
  };

  const renderNetworkIcon = () => {
    if (!chain) return null;

    const iconPath = networkIcons[chain.id];
    if (iconPath) {
      return (
        <div className="connect-wallet-network">
          <img
            src={iconPath}
            alt={chain.name}
            className="connect-wallet-network-icon"
          />
        </div>
      );
    }

    return <span className="connect-wallet-network-text">{chain.name}</span>;
  };

  if (!mounted) {
    return (
      <button disabled className="connect-wallet-button" aria-busy="true">
        Loading...
      </button>
    );
  }

  if (isConnecting || connectStatus === 'pending') {
    return (
      <button
        disabled
        className="connect-wallet-button connect-wallet-button--loading"
        aria-busy="true"
      >
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="connect-wallet-container">
        <button
          onClick={() => appKit?.open()}
          className="connect-wallet-button"
        >
          {chain && renderNetworkIcon()}
          {address && (
            <span className="connect-wallet-address">
              {address.substring(0, 3)}...
              {address.substring(address.length - 4)}
            </span>
          )}
          {balanceData && !isBalanceLoading && !balanceError && (
            <span className="connect-wallet-balance">
              {Number(balanceData.formatted).toFixed(4)} {balanceData.symbol}
            </span>
          )}
          {isBalanceLoading && (
            <span className="connect-wallet-balance">Loading...</span>
          )}
          {balanceError && <span className="connect-wallet-error">Error</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="connect-wallet-container">
      <button onClick={handleConnectClick} className="connect-wallet-button">
        Connect Wallet
      </button>
      {connectError && (
        <p className="connect-wallet-error">
          Connection Failed: {connectError.message || 'Please try again.'}
        </p>
      )}
    </div>
  );
}

export default ConnectWallet;
