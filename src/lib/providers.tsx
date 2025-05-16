// 'use client';
// import { createConfig, http } from 'wagmi';
// import { mainnet, sepolia } from 'wagmi/chains';
// import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

// export const config = createConfig({
//   chains: [mainnet, sepolia], // Add your preferred chains
//   transports: {
//     [mainnet.id]: http(),
//     [sepolia.id]: http(),
//   },
//   connectors: [
//     injected(),
//     coinbaseWallet({ appName: 'IFA LABS' }),
//     walletConnect({ projectId: 'd455dfd5fa55e30b207db9ed8bc1c6a0' }),
//   ],
//   ssr: true, // Required for Next.js
// });
