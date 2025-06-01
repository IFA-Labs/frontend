'use client';
import React, { useState, useEffect } from 'react';
import { Logo } from '@/components/svg';
import Link from 'next/link';
import { ConnectWallet } from '@/components/connect-wallet-button';
import {
  HamburgerIcon,
  CloseIcon,
  MenuIcon,
  FaqIcon,
  BlogIcon,
} from '../../svg';
const Navbar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const openModal = () => setIsModalOpen(true);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMouseEnter = (
    menuSetter: React.Dispatch<React.SetStateAction<boolean>>,
    timeoutRef: React.RefObject<NodeJS.Timeout | null>,
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    menuSetter(true);
  };

  const handleMouseLeave = (
    menuSetter: React.Dispatch<React.SetStateAction<boolean>>,
    timeoutRef: React.RefObject<NodeJS.Timeout | null>,
  ) => {
    timeoutRef.current = setTimeout(() => {
      menuSetter(false);
    }, 100);
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
              <Link href="/swap">Swap</Link>
            </li>
            <li>
              <Link href="/pools">Pool</Link>
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
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navbar;
