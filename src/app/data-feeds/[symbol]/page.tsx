import type { Metadata } from 'next';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import DataFeedDetail from '@/components/data-feeds/detail';

type PageProps = {
  params: Promise<{
    symbol: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return {
    title: `${upperSymbol} Data Feed`,
    description: `View the ${upperSymbol} oracle dataset, pricing overview, metadata, and chart history on IFA LABS.`,
  };
}

export default async function DataFeedDatasetPage({ params }: PageProps) {
  const { symbol } = await params;

  return (
    <div>
      <Navbar />
      <DataFeedDetail slug={symbol} />
      <Footer />
    </div>
  );
}
