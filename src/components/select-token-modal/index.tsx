'use client';
import React, { FC, useState, useEffect } from 'react';
import { tokenList, TokenInfo } from '@/lib/tokens';
import { SearchIcon, SuiIcon } from '@/components/svg';
import Image from 'next/image';

// Tokens that should appear first, in this order
const PRIORITIZED_SYMBOLS = [
  'SUI',
  'USDSUI',
  'WAL',
  'CNGN',
  'ZARP',
  'BRZ',
  'USDC',
  'USDT',
  'ETH',
];

const sortTokens = (
  a: { symbol?: string; name?: string; order?: number },
  b: { symbol?: string; name?: string; order?: number },
) => {
  const aSym = (a.symbol || a.name || '').toUpperCase();
  const bSym = (b.symbol || b.name || '').toUpperCase();

  const aIndex = PRIORITIZED_SYMBOLS.indexOf(aSym);
  const bIndex = PRIORITIZED_SYMBOLS.indexOf(bSym);

  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }

  const aOrder = a.order ?? 9999;
  const bOrder = b.order ?? 9999;
  if (aOrder !== bOrder) return aOrder - bOrder;

  return (a.name || a.symbol || '').localeCompare(b.name || b.symbol || '');
};

const TokenModalIcon = ({ token }: { token: TokenInfo }) => {
  if (token.symbol?.toUpperCase() === 'SUI') {
    return <SuiIcon />;
  }

  return (
    <Image
      src={token.icon}
      alt={token.name || token.symbol}
      width={24}
      height={24}
    />
  );
};

interface SelectTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  availableTokens?: TokenInfo[];
  activeTokenField?: 'from' | 'to' | 'pay' | 'receive';
}

const SelectTokenModal: FC<SelectTokenModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  availableTokens,
  activeTokenField,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<TokenInfo[]>(
    (availableTokens ? availableTokens : Object.values(tokenList))
      .slice()
      .sort(sortTokens),
  );

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFilteredTokens(
        (availableTokens ? availableTokens : Object.values(tokenList))
          .slice()
          .sort(sortTokens),
      );
    }
  }, [isOpen, availableTokens]);

  useEffect(() => {
    const tokens = availableTokens ? availableTokens : Object.values(tokenList);

    if (searchQuery.trim() === '') {
      setFilteredTokens(
        tokens.slice().sort((a, b) => {
          return sortTokens(a, b);
        }),
      );
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tokens.filter((token) => {
      const searchBy = token.name || token.symbol || '';
      return searchBy.toLowerCase().includes(query);
    });

    setFilteredTokens(filtered.slice().sort(sortTokens));
  }, [searchQuery, availableTokens]);

  if (!isOpen) return null;

  return (
    <div className="select-token-modal-container" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5>Select a token</h5>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="search-token">
          <input
            type="text"
            placeholder="Search token"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="search-icon">
            <SearchIcon />
          </div>
        </div>
        <div className="all-tokens">
          {filteredTokens.map((token) => (
            <div
              key={token.symbol || token.name}
              onClick={() => onSelect(token)}
              className="token"
            >
              <div className="token-icon">
                <TokenModalIcon token={token} />
              </div>
              <div className="token-name">{token.name || token.symbol}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectTokenModal;
