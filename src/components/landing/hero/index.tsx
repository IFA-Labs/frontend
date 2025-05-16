'use client';
import React, { useState } from 'react';
import Calculator from './calculator';
import Image from 'next/image';
import { ArrowRightIcon } from '../../svg';
import HeroIllustration from '../../../../public/images/hero-illustration.svg';
import { KombatLogo, ConvexityLogo, BaseLogo, CngnLogo } from '../../svg';
import CryptoTracker from './tracker';
import TabToggle from './tab-toggle';
import Link from 'next/link';
const Hero = () => {
  const [activeTab, setActiveTab] = useState<'crypto' | 'swap'>('crypto');
  return (
    <section className="hero-container">
      <main>
        <div className="hero-desc">
          <h2>
            The world's first
            <br />
            <span>Multi-chain</span>
            <br />
            stablecoin oracle
          </h2>

          <p>
            Ifa Labs is building a trustless, multi-chain oracle infrastructure
            for stablecoin and financial data feeds
          </p>

          <Link
            href="https://github.com/IFA-Labs/oracle_contract"
            target="_blank"
          >
            <button>
              Start building <ArrowRightIcon />
            </button>
          </Link>

          <div className="partners-container">
            <label htmlFor="">Trusted By</label>

            <div className="partners">
              <CngnLogo />
              <KombatLogo />
              <BaseLogo />
              <ConvexityLogo />
            </div>
          </div>
        </div>

        <div className="widget-container">
          <TabToggle activeTab={activeTab} setActiveTab={setActiveTab} />
          {activeTab === 'crypto' ? <CryptoTracker /> : <Calculator />}
        </div>
      </main>

      <Image
        src={HeroIllustration}
        className="hero-img"
        alt=""
        width={680}
        height={680}
      />
    </section>
  );
};

export default Hero;
