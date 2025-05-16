import React from 'react';
import {
  InfoIcon,
  EmptyPositionIcon,
  PlusBlackIcon,
  SearchIcon,
} from '../../svg';
import PoolTable from './pool-table';
const Pool = () => {
  return (
    <div className="pool-container">
      <div className="my-pool-card">
        <div className="tvl">
          <label>
            TVL <InfoIcon />
          </label>
          <div className="tvl-value">$1000.0</div>
        </div>

        <div className="cta">Collect Rewards</div>
      </div>

      <main>
        <div className="my-pool-card-container">
          <div className="my-pool-card-header">
            <div className="my-pool-card-header-title">Your Pool</div>
            <div className="my-pool-card-header-actions">
              <button>
                <PlusBlackIcon /> Add Position
              </button>
            </div>
          </div>

          <div className="empty-pool-card">
            <EmptyPositionIcon />
            <div className="empty-pool-card-title">
              Welcome to your positions
            </div>
            <div className="empty-pool-card-description">
              Connect your wallet to view your current positions.
            </div>
          </div>
        </div>

        <div className="my-pool-card-container">
          <div className="my-pool-card-header">
            <div className="my-pool-card-header-title">Top Pools</div>
            <div className="my-pool-card-header-actions">
              <div className="search-pool-input">
                <SearchIcon />
                <input type="text" placeholder="Search" />
              </div>
            </div>
          </div>

          <PoolTable />
        </div>
      </main>
    </div>
  );
};

export default Pool;
