import Hero from '@/components/landing/hero';
import Navbar from '@/components/navbar';
import CryptoTicker from '@/components/landing/ticker';
import StatsSection from '@/components/landing/stats';
import Benefits from '@/components/landing/benefits';
import BlogSection from '@/components/landing/blog';
import StartBuilding from '@/components/start-building';
import Audit from '@/components/landing/audit';
import Footer from '@/components/footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IFA LABS - Multi-Chain Stablecoin Oracle',
  description:
    "The world's first Multi-chain stablecoin oracle. Get accurate, real-time price feeds for stablecoins across multiple blockchains. Swap tokens, access liquidity pools, and monitor live crypto prices.",
  openGraph: {
    title: 'IFA LABS - Multi-Chain Stablecoin Oracle',
    description:
      'Get accurate, real-time price feeds for stablecoins across multiple blockchains.',
    url: 'https://ifalabs.com',
    type: 'website',
  },
  alternates: {
    canonical: 'https://ifalabs.com',
  },
};

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <CryptoTicker />
      <StatsSection />
      <Benefits />
      <BlogSection />
      <Audit />
      <StartBuilding />
      <Footer />
    </div>
  );
}
