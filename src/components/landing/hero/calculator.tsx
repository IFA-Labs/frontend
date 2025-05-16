'use client';
import React, { useState, useEffect } from 'react';
import SelectTokenModal from '@/components/select-token-modal';
import { SwapIcon, LockIcon } from '@/components/svg';
import Link from 'next/link';
import Image from 'next/image';
import apiService from '@/lib/api';
import { tokenList, TokenInfo, formatPrice } from '@/lib/tokens';
import useExchangeRate from '@/hooks/useExchangeRates';

interface Token {
  icon: string;
  name: string;
}

const Calculator = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeTokenField, setActiveTokenField] = useState<'pay' | 'receive'>(
    'pay',
  );
  const [tokens, setTokens] = useState<{ pay: TokenInfo; receive: TokenInfo }>({
    pay: tokenList.ETH,
    receive: tokenList.USDT,
  });
  const [amounts, setAmounts] = useState({ pay: '', receive: '' });
  const { rate: exchangeRate, loading } = useExchangeRate(
    tokens.pay.name,
    tokens.receive.name,
  );

  useEffect(() => {
    if (exchangeRate && amounts.pay) {
      const payAmount = parseFloat(amounts.pay);
      if (!isNaN(payAmount)) {
        const receiveAmount = (payAmount * exchangeRate).toFixed(6);
        setAmounts((prev) => ({ ...prev, receive: receiveAmount }));
      }
    }
  }, [amounts.pay, exchangeRate]);

  useEffect(() => {
    if (exchangeRate && amounts.receive && !amounts.pay) {
      const receiveAmount = parseFloat(amounts.receive);
      if (!isNaN(receiveAmount) && exchangeRate !== 0) {
        const payAmount = (receiveAmount / exchangeRate).toFixed(6);
        setAmounts((prev) => ({ ...prev, pay: payAmount }));
      }
    }
  }, [amounts.receive, exchangeRate]);

  const openModal = (field: 'pay' | 'receive') => {
    setActiveTokenField(field);
    setModalOpen(true);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    setTokens((prev) => ({ ...prev, [activeTokenField]: token }));
    setModalOpen(false);
    setAmounts({ pay: '', receive: '' });
  };

  const swapValues = () => {
    setTokens((prev) => ({ pay: prev.receive, receive: prev.pay }));
    setAmounts((prev) => ({ pay: prev.receive, receive: prev.pay }));
  };

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmounts((prev) => ({ ...prev, pay: value }));

    if (exchangeRate && value) {
      const payAmount = parseFloat(value);
      if (!isNaN(payAmount)) {
        const receiveAmount = (payAmount * exchangeRate).toFixed(6);
        setAmounts((prev) => ({ ...prev, pay: value, receive: receiveAmount }));
      }
    } else {
      setAmounts((prev) => ({ ...prev, pay: value, receive: '' }));
    }
  };

  const handleReceiveAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;

    if (exchangeRate && value) {
      const receiveAmount = parseFloat(value);
      if (!isNaN(receiveAmount) && exchangeRate !== 0) {
        const payAmount = (receiveAmount / exchangeRate).toFixed(6);
        setAmounts({ pay: payAmount, receive: value });
      }
    } else {
      setAmounts({ pay: '', receive: value });
    }
  };

  return (
    <div className="calculator-container">
      <div className="price-wrapper">
        <h3>
          <LockIcon />
          Rate by IFÁ LABS
        </h3>
        {loading ? (
          <div className="price">Loading rate...</div>
        ) : exchangeRate ? (
          <div className="price">
            1 {tokens.pay.name} ≈ {formatPrice(exchangeRate)}{' '}
            {tokens.receive.name}
          </div>
        ) : (
          <div className="price">Rate unavailable</div>
        )}
      </div>

      <div className="swap-container">
        <div className="swap-input-container">
          <div className="swap-input">
            <div className="swap-form">
              <label htmlFor="You Pay">From</label>
              <input
                type="number"
                placeholder="0.00"
                value={amounts.pay}
                onChange={handlePayAmountChange}
              />
            </div>
            <button className="token" onClick={() => openModal('pay')}>
              <div className="icon">
                <Image src={tokens.pay.icon} alt="" width={24} height={24} />
                <span>{tokens.pay.name}</span>
              </div>
            </button>
          </div>

          <button
            className="swap-input-button"
            title="Exchange values"
            onClick={swapValues}
          >
            <SwapIcon />
          </button>

          <div className="swap-input">
            <div className="swap-form">
              <label htmlFor="You Receive">To</label>
              <input
                type="number"
                placeholder="0.00"
                value={amounts.receive}
                onChange={handleReceiveAmountChange}
              />
            </div>
            <button className="token" onClick={() => openModal('receive')}>
              <div className="icon">
                <Image
                  src={tokens.receive.icon}
                  alt=""
                  width={24}
                  height={24}
                />
                <span>{tokens.receive.name}</span>
              </div>
            </button>
          </div>
        </div>

        <Link
          href={{
            pathname: '/swap',
            query: {
              payAmount: amounts.pay,
              receiveAmount: amounts.receive,
              payToken: tokens.pay.name,
              receiveToken: tokens.receive.name,
            },
          }}
        >
          <button
            className="swap-cta"
            // disabled={!amounts.pay || !amounts.receive || loading}
          >
            Proceed to Swap
          </button>
        </Link>

        <SelectTokenModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleTokenSelect}
        />
      </div>
    </div>
  );
};

export default Calculator;
