'use client';
import React from 'react';
import { ArrowUpGreenIcon } from '../../svg';

const StatsCard: React.FC<{
  description: string;
  number: string;
  label: string;
  targetNumber: number;
}> = ({ description, number, label, targetNumber }) => {
  const [displayNumber, setDisplayNumber] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          const duration = 1500;
          const interval = 20;
          const steps = duration / interval;
          const increment = targetNumber / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current < targetNumber) {
              setDisplayNumber(Math.floor(current));
            } else {
              setDisplayNumber(targetNumber);
              clearInterval(timer);
            }
          }, interval);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [targetNumber]);

  const sanitizedId = description.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Determine display suffix
  const isOne = targetNumber === 1;
  const isHundred = targetNumber === 100;

  return (
    <div
      ref={cardRef}
      id={`card-${sanitizedId}`}
      className={`card ${isVisible ? 'visible' : ''}`}
    >
      <p className="card-description">{description}</p>

      <div className="stat">
        <div className="card-number">
          {displayNumber}
           {isHundred &&  '%'}
          {!isOne && !isHundred && '+'}
          {!isOne && (
            <span className="plus-icon">
              <ArrowUpGreenIcon />
            </span>
          )}
        </div>
        <p className="card-label">{label}</p>
      </div>
    </div>
  );
};

const StatsSection: React.FC = () => {
  const stats = [
    {
      description:
        'Multiple local stablecoins integrated, with more being added as they emerge.',
      number: '10',
      label: 'Stablecoins',
      target: 10,
    },
    {
      description:
        'All price feeds and rates are publicly auditable onchain — trust, but verify.',
      number: '520',
      label: 'Proof-Of-Source',
      target: 100,
    },
    {
      description:
        'Provides reliable price data for both onchain and offchain use cases, ensuring comprehensive market coverage and accuracy.',
      number: '100',
      label: 'Data Feeds',
      target: 2,
    },
    {
      description:
        'Per day allow for more precise and secure operations for your smart contracts.',
      number: '1',
      label: 'Blockchains',
      target: 1,
    },
  ];

  return (
    <div className="stats-section">
      <div className="cards">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            description={stat.description}
            number={stat.number}
            label={stat.label}
            targetNumber={stat.target}
          />
        ))}
      </div>
    </div>
  );
};

export default StatsSection;
