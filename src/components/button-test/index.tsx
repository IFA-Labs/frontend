// components/BetterConnectWallet.tsx
'use client';

import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export function BetterConnectWallet() {
  const { connectors, connect, status, error } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Filter out unsupported connectors
  const availableConnectors = connectors.filter((connector) => connector.ready);

  if (!mounted) return null;

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <span>{address}</span>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="wallet-connector">
      {availableConnectors.length > 0 ? (
        availableConnectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={status === 'pending'}
          >
            {connector.name}
            {status === 'pending' && ' (connecting)'}
          </button>
        ))
      ) : (
        <p>
          No wallet providers available. Please install MetaMask or another
          supported wallet.
        </p>
      )}
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
