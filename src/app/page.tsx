import Hero from '@/components/landing/hero';
import Navbar from '@/components/navbar';
import CryptoTicker from '@/components/landing/ticker';
import StatsSection from '@/components/landing/stats';
import Benefits from '@/components/landing/benefits';
import BlogSection from '@/components/landing/blog';
import StartBuilding from '@/components/start-building';
import Footer from '@/components/footer';
export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <CryptoTicker />
      <StatsSection />
      <Benefits />
      <BlogSection />
      <StartBuilding />
      <Footer />
    </div>
  );
}
