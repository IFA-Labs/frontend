'use client';
import '@/lib/suppress-console-noise';
import React, { type ReactNode } from 'react';
import { wagmiAdapter, projectId } from '@/lib/wagmi-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { mainnet, sepolia, base, baseSepolia } from '@reown/appkit/networks';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';
import logoIcon from '../../public/images/logo-icon.svg';
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from '@mysten/dapp-kit';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const queryClient = new QueryClient();
const { networkConfig } = createNetworkConfig({
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' },
  devnet: { url: getJsonRpcFullnodeUrl('devnet'), network: 'devnet' },
  mainnet: { url: getJsonRpcFullnodeUrl('mainnet'), network: 'mainnet' },
  localnet: { url: getJsonRpcFullnodeUrl('localnet'), network: 'localnet' },
});

if (!projectId) {
  throw new Error('Project ID is not defined');
}

const metadata = {
  name: 'Ifa Labs',
  description: 'Ifa Labs DEX',
  url:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'https://www.ifalabs.com'),
  icons: [logoIcon],
};

const META_MASK_ID =
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96';
const TRUST_WALLET_ID =
  '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0';
const COINBASE_WALLET_ID =
  'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa';

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base, baseSepolia, mainnet, sepolia],
  defaultNetwork: baseSepolia,
  metadata: metadata,
  defaultAccountTypes: {
    eip155: 'eoa',
  },
  featuredWalletIds: [META_MASK_ID, TRUST_WALLET_ID, COINBASE_WALLET_ID],
  enableCoinbase: true,
  coinbasePreference: 'smartWalletOnly',
  features: {
    analytics: process.env.NODE_ENV === 'production',
    swaps: false,
    onramp: true,
    connectMethodsOrder: ['wallet'],
  },
});

function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider autoConnect>{children}</WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
