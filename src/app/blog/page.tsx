import React from 'react';
import Navbar from '@/components/navbar';
import Blog from '@/components/blog';
import StartBuilding from '@/components/start-building';
import Footer from '@/components/footer';

const index = () => {
  return (
    <div>
      <Navbar />
      <Blog />
      <StartBuilding />
      <Footer />
    </div>
  );
};

export default index;
