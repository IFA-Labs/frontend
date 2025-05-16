'use client'
import React, { useState } from 'react';
import { MinusIcon, PlusIcon } from '../svg';
interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="faq-item">
      <div className="faq-question" onClick={toggleOpen}>
        <span>{question}</span>
        <button className="faq-button" onClick={toggleOpen}>
          {isOpen ? <MinusIcon /> : <PlusIcon />}
        </button>
      </div>
      <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
        <p>{answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  const faqData: FAQItemProps[] = [
    {
      question: 'What is IFÁ Labs?',
      answer:
        'IFÁ Labs is a trustless oracle network providing accurate, real-time data for stablecoins and other financial instruments - onchain and offchain.',
    },
    {
      question: 'Which stablecoins and currencies do you support?',
      answer:
        'We’ll support all local stablecoins on Base like cNGN, USDC, EURC, BRZ, CADC, IDRX, MXNe, ZARP, NZDD, TRYB, and popular cryptocurrencies like BTC, ETH, BNB, XRP, and more.',
    },
    {
      question: 'How can developers use IFÁ Labs?',
      answer:
        'Developers can access our onchain price feeds, historical data APIs, and swap to build or integrate financial applications.',
    },
    {
      question: 'What types of projects can use IFÁ Labs?',
      answer:
        'Any project that needs accurate stablecoin and financial data - like DeFi protocols, fintech apps, cross-border payment systems, and wallets.',
    },
    {
      question: 'What chains does IFÁ Labs support?',
      answer:
        'We are mult-chain by design, currently live on Base. Our infrastructure is compatible with all EVMs.',
    },
    {
      question: 'What is the IFÁVERSE?',
      answer:
        'IFÁVERSE is the ecosystem layer of IFÁ Labs - a suite of products that are built on our oracle infrastructure.',
    },
    {
      question: 'What is IFÁ Swap?',
      answer:
        'IFÁ Swap is a native product that allows direct stablecoin-to-stablecoin swaps, powered by verified price feeds from IFÁ Labs.',
    },
    {
      question: 'Is IFÁ Labs audited?',
      answer: 'Yes. You can access our audit report here.',
    },
    {
      question: 'What is “proof-of-source” in IFÁ Labs?',
      answer:
        '“Proof-of-source” is our commitment to verifiable and transparent data origin, ensuring all price feeds come from audited and trusted sources. Means all price data are publicly auditable.',
    },
    {
      question: 'Is IFÁ Labs a blockchain?',
      answer:
        'No, IFÁ Labs is not a blockchain. We’re a multi-chain oracle infrastructure that brings real-world data to existing blockchains and protocols.',
    },
    {
      question: 'Does IFÁ Labs have a native token?',
      answer:
        'Currently, we are focused on infrastructure and adoption. A native token may be introduced later as part of governance.',
    },
    {
      question: 'What problem is IFÁ Labs solving?',
      answer:
        'We’re solving the lack of stablecoin data onchain ecosystems, especially for underrepresented currencies.',
    },
    {
      question: 'Can anyone contribute data to IFÁ Labs?',
      answer:
        'Not yet. We only accept data from verified and whitelisted providers, but we plan to decentralize data contributions in the future.',
    },
  ];
  return (
    <section className="faq-container">
      <div className="header">
        <div className="title">
          Frequently <br />
          <span>Asked Questions</span>
        </div>
        <div className="desc">Last Updated on 12th May, 2025.</div>
      </div>

      <div className="faqs">
        {faqData.map((item, index) => (
          <FAQItem key={index} question={item.question} answer={item.answer} />
        ))}
      </div>
    </section>
  );
};

export default FAQ;
