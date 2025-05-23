import { useState, useEffect, useRef } from 'react';

interface TabToggleProps {
  activeTab: 'crypto' | 'swap';
  setActiveTab: (tab: 'crypto' | 'swap') => void;
}

const TabToggle: React.FC<TabToggleProps> = ({ activeTab, setActiveTab }) => {


  return (
    <div className="toggle-wrapper">
      <div
        className={`toggle-slider ${
          activeTab === 'crypto' ? 'crypto' : 'swap'
        }`}
      />
      <button
        className={activeTab === 'crypto' ? 'active' : ''}
        onClick={() => setActiveTab('crypto')}
      >
        Crypto
      </button>
      <button
        className={activeTab === 'swap' ? 'active' : ''}
        onClick={() => setActiveTab('swap')}
      >
        Swap
      </button>
    </div>
  );
};

export default TabToggle;
