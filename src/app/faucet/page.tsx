import type { Metadata } from 'next';
import Navbar from '@/components/app/navbar';
import Faucet from '@/components/faucet';

export const metadata: Metadata = {
  title: 'Testnet Faucet',
  description:
    'Drip stablecoins into any testnet wallet. IFÁ Labs faucet seeds testnet wallets with native gas and local-currency stables — cNGN, BRZ, ZARP and ifaUSD.',
  alternates: {
    canonical: 'https://ifalabs.com/faucet',
  },
};

export default function FaucetPage() {
  return (
    <div>
      <Navbar />
      <Faucet />
    </div>
  );
}
