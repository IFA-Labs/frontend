'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components/svg';
import {
  HamburgerIcon,
  CloseIcon,
  MenuIcon,
  FaqIcon,
  BlogIcon,
  ArrowDownIcon,
} from '../svg';

const Navbar: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [showDevelopersMenu, setShowDevelopersMenu] = useState(false);
  const [mailTo, setMailTo] = useState('ifalabstudio@gmail.com');

  const resourcesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const productsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const developersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openModal = () => setIsModalOpen(true);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMouseEnter = (
    menuSetter: React.Dispatch<React.SetStateAction<boolean>>,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    menuSetter(true);
  };

  const handleMouseLeave = (
    menuSetter: React.Dispatch<React.SetStateAction<boolean>>,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  ) => {
    timeoutRef.current = setTimeout(() => {
      menuSetter(false);
    }, 100);
  };

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();

    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
      if (resourcesTimeoutRef.current)
        clearTimeout(resourcesTimeoutRef.current);
      if (productsTimeoutRef.current) clearTimeout(productsTimeoutRef.current);
      if (developersTimeoutRef.current)
        clearTimeout(developersTimeoutRef.current);
    };
  }, []);

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
      <div className="navbar-container">
        <main>
          <Link href="/" className="logo">
            <Logo />
          </Link>

          <ul className="nav-links">
            <li>
              <Link href="https://docs.ifalabs.com" target="_blank">
                Developers
              </Link>
            </li>
            <li
              onMouseEnter={() =>
                handleMouseEnter(setShowProductsMenu, productsTimeoutRef)
              }
              onMouseLeave={() =>
                handleMouseLeave(setShowProductsMenu, productsTimeoutRef)
              }
              className="resources-dropdown"
            >
              <div className="nav-item-text">Products</div>
              <MenuIcon />
            </li>

            <li
              onMouseEnter={() =>
                handleMouseEnter(setShowResourcesMenu, resourcesTimeoutRef)
              }
              onMouseLeave={() =>
                handleMouseLeave(setShowResourcesMenu, resourcesTimeoutRef)
              }
              className="resources-dropdown"
            >
              <div className="nav-item-text">Resources</div>
              <MenuIcon />
            </li>
            <li>
              <Link href="/swap">Swap</Link>
            </li>
          </ul>

          <a href={`mailto:${mailTo}`} className="cta">
            Contact
          </a>

          <div
            className={`hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
          >
            {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </div>
        </main>
      </div>

      {showDevelopersMenu && (
        <div
          className="resources-menu developers-menu"
          onMouseEnter={() =>
            handleMouseEnter(setShowDevelopersMenu, developersTimeoutRef)
          }
          onMouseLeave={() =>
            handleMouseLeave(setShowDevelopersMenu, developersTimeoutRef)
          }
        >
          <Link
            href="https://github.com/IFA-Labs/oracle_contract"
            target="_blank"
            className="menu-item"
          >
            <div className="icon">
              <FaqIcon />
            </div>
            <div className="link-details">
              <div className="title">Onchain</div>
              <div className="desc">Onchain Documentation</div>
            </div>
          </Link>
          <Link
            href="http://146.190.186.116:8000/swagger/index.html"
            target="_blank"
            className="menu-item"
          >
            <div className="icon">
              <BlogIcon />
            </div>
            <div className="link-details">
              <div className="title">Offchain</div>
              <div className="desc">Offchain Documentation</div>
            </div>
          </Link>
        </div>
      )}

      {showProductsMenu && (
        <div
          className="resources-menu products-menu"
          onMouseEnter={() =>
            handleMouseEnter(setShowProductsMenu, productsTimeoutRef)
          }
          onMouseLeave={() =>
            handleMouseLeave(setShowProductsMenu, productsTimeoutRef)
          }
        >
          <Link href="/swap">
            <div className="icon">
              <FaqIcon />
            </div>
            <div className="link-details">
              <div className="title">Swap</div>
              <div className="desc">Swap your stablecoins/tokens</div>
            </div>
          </Link>
          <Link
            href="https://www.mykombat.xyz/"
            target="_blank"
            className="menu-item"
          >
            <div className="icon">
              <BlogIcon />
            </div>
            <div className="link-details">
              <div className="title">Kombat</div>
              <div className="desc">Decentralized prediction markets</div>
            </div>
          </Link>
        </div>
      )}

      {showResourcesMenu && (
        <div
          className="resources-menu "
          onMouseEnter={() =>
            handleMouseEnter(setShowResourcesMenu, resourcesTimeoutRef)
          }
          onMouseLeave={() =>
            handleMouseLeave(setShowResourcesMenu, resourcesTimeoutRef)
          }
        >
          <Link href="/faq">
            <div className="icon">
              <FaqIcon />
            </div>
            <div className="link-details">
              <div className="title">FAQ</div>
              <div className="desc">Read our FAQs</div>
            </div>
          </Link>
          <Link href="/blog">
            <div className="icon">
              <BlogIcon />
            </div>
            <div className="link-details">
              <div className="title">Blog</div>
              <div className="desc">Read our blogs</div>
            </div>
          </Link>
        </div>
      )}

      <div className={`mobile-nav-container ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav animate-slide-up ">
          <ul className="nav-links">
            <li>
              <Link href="https://docs.ifalabs.com" target="_blank">
                Developers
              </Link>
            </li>
            <li
              onMouseEnter={() =>
                handleMouseEnter(setShowProductsMenu, productsTimeoutRef)
              }
              onMouseLeave={() =>
                handleMouseLeave(setShowProductsMenu, productsTimeoutRef)
              }
              className="resources-dropdown"
            >
              <div className="nav-item-text">Products</div>
              <MenuIcon />
            </li>

            <li
              onMouseEnter={() =>
                handleMouseEnter(setShowResourcesMenu, resourcesTimeoutRef)
              }
              onMouseLeave={() =>
                handleMouseLeave(setShowResourcesMenu, resourcesTimeoutRef)
              }
              className="resources-dropdown"
            >
              <div className="nav-item-text">Resources</div>
              <MenuIcon />
            </li>
            <li>
              <Link href="/swap">Swap</Link>
            </li>
          </ul>
          <Link href="https://docs.ifalabs.com" id="join">
            <button className="cta">Get Started</button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Navbar;
