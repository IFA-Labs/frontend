import React from 'react';
import Navbar from '@/components/navbar';
import FAQ from '@/components/faq';
import StartBuilding from '@/components/start-building';
import Footer from '@/components/footer';
const page = () => {
  return (
    <div>
      <Navbar />
      <FAQ />
      <StartBuilding />
      <Footer />
    </div>
  );
};

export default page;
