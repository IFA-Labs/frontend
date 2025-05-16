'use client';
import React, { FC, useState, useEffect } from 'react';
import { tokenList, TokenInfo } from '@/lib/tokens';
import { SearchIcon } from '@/components/svg';
import Image from 'next/image';

interface SelectTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  availableTokens?: TokenInfo[]; // Make this optional for compatibility
  activeTokenField?: 'from' | 'to' | 'pay' | 'receive'; // Make this optional for compatibility
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
    availableTokens ? availableTokens : Object.values(tokenList),
  );

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFilteredTokens(
        availableTokens ? availableTokens : Object.values(tokenList),
      );
    }
  }, [isOpen, availableTokens]);

  useEffect(() => {
    const tokens = availableTokens ? availableTokens : Object.values(tokenList);

    if (searchQuery.trim() === '') {
      setFilteredTokens(tokens);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tokens.filter((token) => {
      const searchBy = token.name || token.symbol || '';
      return searchBy.toLowerCase().includes(query);
    });

    setFilteredTokens(filtered);
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
                <Image
                  src={token.icon}
                  alt={token.name || token.symbol}
                  width={24}
                  height={24}
                />
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
