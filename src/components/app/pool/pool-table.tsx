import React from 'react';

const PoolTable = () => {
  const pools = [
    {
      id: 1,
      pool: 'WISE/ETH',

      feeTier: '0.30%',
      tvl: '$158.2M',
      poolApr: '0.0093%',
      rewardApr: '-',
      vol1d: '$4.0K',
      vol30d: '$138.8K',
    },
    {
      id: 2,
      pool: 'USDC/USDT',

      feeTier: '0.01%',
      tvl: '$151.1M',
      poolApr: '1.04%',
      rewardApr: '+6.24%',
      vol1d: '$43.0M',
      vol30d: '$1.5B',
    },
    {
      id: 3,
      pool: 'USDC/ETH',
      feeTier: '0.05%',
      tvl: '$124.6M',
      poolApr: '33.947%',
      rewardApr: '-',
      vol1d: '$231.7M',
      vol30d: '$4.3B',
    },
    {
      id: 4,
      pool: 'WBTC/USDC',
      feeTier: '0.30%',
      tvl: '$92.5M',
      poolApr: '45.038%',
      rewardApr: '-',
      vol1d: '$38.1M',
      vol30d: '$803.5M',
    },
    {
      id: 5,
      pool: 'ETH/wstETH',
      feeTier: '0.01%',
      tvl: '$89.2M',
      poolApr: '0.775%',
      rewardApr: '-3.23%',
      vol1d: '$18.9M',
      vol30d: '$101.3M',
    },
  ];

  return (
    <div className="crypto-table">
      <div className="table-header">
        <div className="header-cell">#</div>
        <div className="header-cell">Pool</div>
        <div className="header-cell">↑ TVL</div>
        <div className="header-cell">Pool APR</div>
        <div className="header-cell">Reward APR</div>
        <div className="header-cell">1D vol</div>
        <div className="header-cell">30D vol</div>
      </div>
      <div className="table-body">
        {pools.map((pool) => (
          <div key={pool.id} className="table-row">
            <div className="cell">{pool.id}</div>
            <div className="cell pool-cell">{pool.pool}</div>
            <div className="cell">{pool.tvl}</div>
            <div className="cell">{pool.poolApr}</div>
            <div className="cell">{pool.rewardApr}</div>
            <div className="cell">{pool.vol1d}</div>
            <div className="cell">{pool.vol30d}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PoolTable;
