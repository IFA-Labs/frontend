'use client';
import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FarcasterIcon, XIcon, GithubIcon } from '../svg';


const Footer = () => {  
  return (
    <section className="footer-container">
      <main>
        <div className="newsletter-form-container">
          <h3>Want to receive news and updates?</h3>

          <div className="newsletter-form">
            <input type="text" placeholder="Name" />
            <input type="email" placeholder="Email address" />
            <button>Get Updates</button>
          </div>
        </div>

        <div className="quick-links">
          <label htmlFor="">Links</label>
          <ul>
            <li>
              <a href="">Developers</a>
            </li>
            <li>
              <a href="">Products</a>
            </li>
            <li>
              <a href="">Resources</a>
            </li>
            <li>
              <a href="">Ecosystem</a>
            </li>
            <li>
              <a href="">Community</a>
            </li>
          </ul>
        </div>
      </main>
      <div className="footer-bottom">
        <div className="left">
          <div>©2025 Ifalabs ✦ 9:00 Lagos (WAT)</div>
          <div>Privacy Statement</div>
        </div>

        <div className="sm-links">
          <Link
            href="https://github.com/IFA-Labs/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon />
          </Link>

          <Link
            href="https://x.com/ifalabs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <XIcon />
          </Link>

          <Link
            href="https://warpcast.com/ifalabs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FarcasterIcon />
          </Link>
        </div>
      </div>
      <video
        preload="auto"
        autoPlay
        muted
        loop
        playsInline
        className="footer-illustration"
      >
        <source src="/images/hero-illustration-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </section>
  );
};

export default Footer;
