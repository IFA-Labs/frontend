'use client';
import React, { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits } from 'viem';
import { formatEther } from 'ethers';

const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const ROUTER_ABI = [
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
];

export default function AddLiquidity() {
  const { address, isConnected, chain } = useAccount();
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [deadline, setDeadline] = useState(
    () => Math.floor(Date.now() / 1000) + 1200,
  );

  const { writeContract: approveA } = useWriteContract();
  const { writeContract: approveB } = useWriteContract();
  const { writeContract: addLiquidity, data: liquidityTx } = useWriteContract();
  const { isSuccess: isLiquiditySuccess } = useWaitForTransactionReceipt({
    hash: liquidityTx,
  });

  const handleApprove = async () => {
    const amountAParsed = parseUnits(amountA, 18);
    const amountBParsed = parseUnits(amountB, 18);

    approveA({
      address: tokenA as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [routerAddress, amountAParsed],
    });

    approveB({
      address: tokenB as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [routerAddress, amountBParsed],
    });
  };

  const handleAddLiquidity = async () => {
    const amountAParsed = parseUnits(amountA, 18);
    const amountBParsed = parseUnits(amountB, 18);
    const amountAMin = (amountAParsed * BigInt(95)) / BigInt(100); // 5% slippage
    const amountBMin = (amountBParsed * BigInt(95)) / BigInt(100);

    addLiquidity({
      address: routerAddress as `0x${string}`,
      abi: ROUTER_ABI,
      functionName: 'addLiquidity',
      args: [
        tokenA as `0x${string}`,
        tokenB as `0x${string}`,
        amountAParsed,
        amountBParsed,
        amountAMin,
        amountBMin,
        address,
        BigInt(deadline),
      ],
      chainId: chain?.id,
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded-xl shadow-lg text-white">
      <h2 className="text-xl font-bold mb-4">Add Liquidity</h2>
      <div className="mb-3">
        <label htmlFor="tokenA" className="block text-sm">
          Token A Address
        </label>
        <input
          id="tokenA"
          value={tokenA}
          onChange={(e) => setTokenA(e.target.value)}
          placeholder="Enter Token A address"
          className="w-full border px-2 py-1 rounded"
        />
      </div>
      <div className="mb-3">
        <label htmlFor="tokenB" className="block text-sm">
          Token B Address
        </label>
        <input
          id="tokenB"
          value={tokenB}
          onChange={(e) => setTokenB(e.target.value)}
          placeholder="Enter Token B address"
          className="w-full border px-2 py-1 rounded"
        />
      </div>
      <div className="mb-3">
        <label htmlFor="amountA" className="block text-sm">
          Amount A
        </label>
        <input
          id="amountA"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          placeholder="Enter amount"
          className="w-full border px-2 py-1 rounded"
        />
      </div>
      <div className="mb-3">
        <label htmlFor="amountB" className="block text-sm">
          Amount B
        </label>
        <input
          id="amountB"
          value={amountB}
          onChange={(e) => setAmountB(e.target.value)}
          placeholder="Enter amount"
          className="w-full border px-2 py-1 rounded"
        />
      </div>
      <button
        onClick={handleApprove}
        className="w-full bg-yellow-500 text-white font-semibold py-2 rounded mb-2"
      >
        Approve Tokens
      </button>
      <button
        onClick={handleAddLiquidity}
        className="w-full bg-green-600 text-white font-semibold py-2 rounded"
      >
        Add Liquidity
      </button>
      {isLiquiditySuccess && (
        <p className="text-green-500 mt-2">Liquidity Added Successfully!</p>
      )}
    </div>
  );
}
