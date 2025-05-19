import React from 'react';
import { Logo } from '@/components/svg';
import Link from 'next/link';
import { ConnectWallet } from '@/components/connect-wallet-button';
const Navbar = () => {
  return (
    <div className="app-navbar">
      <main>
        <Link href="/">
          <div className="logo">
            <Logo />
          </div>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/swap">Swap</Link>
          </li>
          <li>
            <Link href="/pools">Pool</Link>
          </li>
        </ul>
        <div className="cta">
          <ConnectWallet />
        </div>
      </main>
    </div>
  );
};

export default Navbar;
