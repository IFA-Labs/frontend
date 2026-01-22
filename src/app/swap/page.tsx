import React from 'react';
import Swap from '@/components/app/swap';
import Navbar from '@/components/app/navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Swap Tokens',
  description:
    'Swap stablecoins and cryptocurrencies instantly with IFA LABS. Trade CNGN, BRZ, USDC, USDT, and ETH with accurate real-time pricing and low fees.',
  openGraph: {
    title: 'Swap Tokens | IFA LABS',
    description:
      'Swap stablecoins and cryptocurrencies instantly with accurate real-time pricing.',
    url: 'https://ifalabs.com/swap',
  },
  alternates: {
    canonical: 'https://ifalabs.com/swap',
  },
};

const SwapPage = () => {
  return (
    <div>
      <Navbar />
      <Swap />
    </div>
  );
};

export default SwapPage;
