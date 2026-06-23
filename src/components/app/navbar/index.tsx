'use client';
import React, { useState, useEffect } from 'react';
import { Logo } from '@/components/svg';
import Link from 'next/link';
import { ConnectWallet } from '@/components/connect-wallet-button';
import { HamburgerIcon, CloseIcon } from '../../svg';
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    if (isMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen, isMobile]);
  return (
    <>
      {' '}
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
              <Link href="/swap">Swap/Sweep</Link>
            </li>
            <li>
              <Link href="/pools">Pool</Link>
            </li>
            <li>
              <Link href="/faucet">Faucet</Link>
            </li>
          </ul>
          <div className="cta">
            <ConnectWallet />
          </div>

          <div
            className={`hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
          >
            {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </div>
        </main>
      </div>
      <div className={`mobile-nav-container ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav animate-slide-up ">
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
            <li>
              <Link href="/faucet">Faucet</Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navbar;
