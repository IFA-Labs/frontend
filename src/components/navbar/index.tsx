'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components/svg';
import { HamburgerIcon, CloseIcon, MenuIcon, FaqIcon, BlogIcon } from '../svg';

const Navbar: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [showDevelopersMenu, setShowDevelopersMenu] = useState(false);
  const [mailTo, setMailTo] = useState('ifalabstudio@gmail.com');

  // Timeout refs for each dropdown menu
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
    // Clear any existing timeout
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
    // Set a timeout before closing the menu
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
          <Link href="/">
            <div className="logo">
              <Logo />
            </div>
          </Link>
          <ul className="nav-links">
            <li
              onMouseEnter={() =>
                handleMouseEnter(setShowDevelopersMenu, developersTimeoutRef)
              }
              onMouseLeave={() =>
                handleMouseLeave(setShowDevelopersMenu, developersTimeoutRef)
              }
              className="resources-dropdown"
            >
              <Link href="/">Developers</Link>
              <MenuIcon />
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
              <Link href="/about">Products</Link>
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
              <Link href="">Resources</Link>
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
          <Link href="">
            <div className="icon">
              <FaqIcon />
            </div>
            <Link
              href="https://github.com/IFA-Labs/oracle_contract"
              className="link-details"
            >
              <div className="title">Onchain</div>
              <div className="desc">Onchain Documentation</div>
            </Link>
          </Link>
          <Link href="">
            <div className="icon">
              <BlogIcon />
            </div>
            <Link
              href="146.190.186.116:8000/swagger/index.html"
              className="link-details"
            >
              <div className="title">Offchain</div>
              <div className="desc">Offchain Documentation</div>
            </Link>
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
          <Link href="">
            <div className="icon">
              <FaqIcon />
            </div>
            <div className="link-details">
              <div className="title">Swap</div>
              <div className="desc">Swap your stablecoins/tokens</div>
            </div>
          </Link>
          <Link href="">
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

      {/* <div className={`mobile-nav-container ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav animate-slide-up ">
          <ul className="nav-links">
            <li>
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" onClick={() => setIsMenuOpen(false)}>
                About
              </Link>
            </li>
            <li>
              <Link href="" onClick={() => setIsMenuOpen(false)}>
                Merch <span>Coming soon!</span>
              </Link>
            </li>
            <li>
              <span
                onClick={() => {
                  setIsMenuOpen(false);
                  openModal();
                }}
              >
                Contact
              </span>
            </li>
          </ul>
          <Link href="/classes" id="join" onClick={() => setIsMenuOpen(false)}>
            <button className="cta">Get Started</button>
          </Link>
        </div>
      </div> */}
    </>
  );
};

export default Navbar;
