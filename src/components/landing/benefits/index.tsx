'use client';
import React from 'react';

const WhyOracleCard: React.FC<{
  title: string;
  description: string;
  cardClass: string;
  isLarge?: boolean;
}> = ({ title, description, cardClass, isLarge = false }) => {
  return (
    <div
      className={`why-oracle-card ${cardClass} ${isLarge ? 'large-card' : ''}`}
    >
      <div className="card-icon"></div>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
    </div>
  );
};

const Benefits: React.FC = () => {
  const cards = [
    {
      title: 'Stablecoins Price Feed Real-Time',
      description:
        'Provides accurate, up-to-the-second price data for stablecoins, ensuring that DeFi applications and smart contracts have access to consistent and reliable blockchain valuations.',
      cardClass: 'stablecoins-card',
      isLarge: false,
    },
    {
      title: 'Automation Services',
      description:
        'Offers automated data retrieval, verification, and delivery processes, reducing manual interventions and ensuring that smart contracts always have access to timely and reliable information.',
      cardClass: 'automation-card',
      isLarge: true,
    },
    {
      title: 'Offchain and Onchain Data',
      description:
        'Aggregates and delivers data from both offchain (external sources like exchanges, financial markets) and onchain (blockchain-verified) sources to ensure broader and more secure data coverage.',
      cardClass: 'offchain-card',
      isLarge: false,
    },
    {
      title: 'Multichain Data In',
      description: '',
      cardClass: 'multichain-card',
      isLarge: false,
    },
    {
      title: 'Auditable Price Tracking',
      description:
        'Aggregates and delivers data from both offchain (external sources like exchanges, financial markets) and onchain (blockchain-verified) sources to ensure broader and more secure data coverage.',
      cardClass: 'auditable-card',
      isLarge: true,
    },
  ];

  return (
    <section className="why-oracle-section">
      <div className="section-container">
        <div className="section-header">
          <div className="pill">Benefits</div>
          <h2 className="section-title">Why Oracle</h2>
        </div>
        <div className="cards-grid">
          <div className="row-1">
            <div className="card stablecoins-card">
              <div className="card-icon"></div>
              <h3 className="card-title">Stablecoins Price Feed Real-Time</h3>
              <p className="card-description">
                Provides accurate, up-to-the-second price data for stablecoins,
                ensuring that DeFi applications and smart contracts have access
                to consistent and reliable blockchain valuations.
              </p>
            </div>

            <div className="card offchain-card">
              <div className="card-icon"></div>
              <h3 className="card-title">Offchain and Onchain Data</h3>
              <p className="card-description">
                Aggregates and delivers data from both offchain (external
                sources like exchanges, financial markets) and onchain
                (blockchain-verified) sources to ensure broader and more secure
                data coverage.
              </p>
            </div>
          </div>

          <div className="row-2">
            <div className="card automation-card">
              <div className="card-icon"></div>
              <h3 className="card-title">Automation Services</h3>
              <p className="card-description">
                Offers automated data retrieval, verification, and delivery
                processes, reducing manual interventions and ensuring that smart
                contracts always have access to timely and reliable information.
              </p>
            </div>
            <div className="card multichain-card">
              <h3 className="card-title">Multichain Data In</h3>
            </div>
          </div>

          <div className="card auditable-card">
            <div className="card-icon"></div>
            <h3 className="card-title">Auditable Price Tracking</h3>
            <p className="card-description">
              Aggregates and delivers data from both offchain (external sources
              like exchanges, financial markets) and onchain
              (blockchain-verified) sources to ensure broader and more secure
              data coverage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
