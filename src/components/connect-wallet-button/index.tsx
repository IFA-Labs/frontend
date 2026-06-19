'use client';

import { ConnectButton } from '@mysten/dapp-kit';
import './style.scss';

export function ConnectWallet() {
  return (
    <div className="connect-wallet-container">
      <ConnectButton
        className="connect-wallet-button"
        connectText="Connect Wallet"
      />
    </div>
  );
}

export default ConnectWallet;
