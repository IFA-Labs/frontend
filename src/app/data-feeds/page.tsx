import type { Metadata } from 'next';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import DataFeeds from '@/components/data-feeds';

export const metadata: Metadata = {
  title: 'Data Feeds',
  description:
    'Explore IFA LABS live oracle data feeds for stablecoins and digital assets across supported networks.',
  alternates: {
    canonical: 'https://ifalabs.com/data-feeds',
  },
};

export default function DataFeedsPage() {
  return (
    <div>
      <Navbar />
      <DataFeeds />
      <Footer />
    </div>
  );
}
