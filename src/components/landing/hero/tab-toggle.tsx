import { useState, useEffect, useRef } from 'react';

interface TabToggleProps {
  activeTab: 'crypto' | 'swap';
  setActiveTab: (tab: 'crypto' | 'swap') => void;
}

const TabToggle: React.FC<TabToggleProps> = ({ activeTab, setActiveTab }) => {
  const [sliderPosition, setSliderPosition] = useState({ left: 0, width: 0 });
  const cryptoTabRef = useRef<HTMLButtonElement>(null);
  const swapTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const targetRef = activeTab === 'crypto' ? cryptoTabRef : swapTabRef;
    if (targetRef.current) {
      setSliderPosition({
        left: targetRef.current.offsetLeft,
        width: targetRef.current.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div className="tab-toggle">
      <div
        className="slider"
        style={{
          left: `${sliderPosition.left}px`,
          width: `${sliderPosition.width}px`,
        }}
      />
      <button
        ref={cryptoTabRef}
        className={`tab-button ${activeTab === 'crypto' ? 'active' : ''}`}
        onClick={() => setActiveTab('crypto')}
      >
        Crypto
      </button>
      <button
        ref={swapTabRef}
        className={`tab-button ${activeTab === 'swap' ? 'active' : ''}`}
        onClick={() => setActiveTab('swap')}
      >
        Swap
      </button>
    </div>
  );
};

export default TabToggle;
