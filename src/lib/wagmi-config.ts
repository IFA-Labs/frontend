import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Define Base Sepolia network configuration
const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
  },
};

// Configure networks with proper RPC endpoints
const networks = [
  {
    ...mainnet,
    rpcUrls: {
      default: {
        http: ['https://eth.llamarpc.com'],
      },
      public: {
        http: ['https://eth.llamarpc.com'],
      },
    },
  },
  {
    ...sepolia,
    rpcUrls: {
      default: {
        http: ['https://rpc.sepolia.org'],
      },
      public: {
        http: ['https://rpc.sepolia.org'],
      },
    },
  },
  // Add Base Sepolia testnet
  baseSepolia,
];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
