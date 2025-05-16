'use client';

import { useEffect, useState } from 'react';
import { parseUnits } from 'viem';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import useExchangeRate from '@/hooks/useExchangeRates';

// ERC20 ABI
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

// Swap ABI (mock)
const SWAP_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
];

const SWAP_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

export function useTokenApproval(
  tokenAddress?: string,
  walletAddress?: `0x${string}`,
  amount?: string,
  decimals = 18,
) {
  const [isApproved, setIsApproved] = useState(false);

  const isNativeToken =
    !tokenAddress ||
    tokenAddress === '' ||
    tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  const validAmount = amount && !isNaN(+amount) && +amount > 0;
  const amountToApprove =
    validAmount && !isNativeToken ? parseUnits(amount, decimals) : BigInt(0);

  const { data: allowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [walletAddress || '0x0', SWAP_ROUTER_ADDRESS],
    query: {
      enabled: !!tokenAddress && !!walletAddress && !isNativeToken,
      refetchInterval: 10000,
    },
  });

  const {
    data: approveResult,
    writeContract,
    isPending: isApproving,
    error: writeError,
  } = useWriteContract();

  const { isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approveResult,
  });

  const approve = () => {
    if (!tokenAddress || !walletAddress || isNativeToken || !validAmount)
      return;
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SWAP_ROUTER_ADDRESS, amountToApprove],
    });
  };

  useEffect(() => {
    if (isNativeToken) {
      setIsApproved(true);
    } else if (
      allowance !== undefined &&
      allowance !== null &&
      typeof allowance === 'bigint'
    ) {
      setIsApproved(allowance >= amountToApprove);
    } else {
      setIsApproved(false);
    }
  }, [
    tokenAddress,
    walletAddress,
    amount,
    allowance,
    isNativeToken,
    amountToApprove,
  ]);

  useEffect(() => {
    if (isApprovalSuccess) {
      setIsApproved(true);
    }
  }, [isApprovalSuccess]);

  return {
    isApproved,
    isApproving,
    approve,
    error: writeError,
  };
}

export function useSwapExecution({
  fromToken,
  toToken,
  fromAmount,
  slippageTolerance = 0.5,
  deadline,
  recipient,
}: {
  fromToken: any;
  toToken: any;
  fromAmount: string;
  slippageTolerance?: number;
  deadline: number;
  recipient: string;
}) {
  const { chain } = useAccount();
  const { rate: exchangeRate } = useExchangeRate(
    fromToken?.symbol || '',
    toToken?.symbol || '',
  );

  const getAmountIn = () => {
    if (!fromAmount || isNaN(+fromAmount)) return BigInt(0);
    return parseUnits(fromAmount, fromToken?.decimals || 18);
  };

  const calculateMinAmountOut = () => {
    if (!fromAmount || !exchangeRate || isNaN(+fromAmount)) return BigInt(0);
    const expectedAmount = +fromAmount * exchangeRate;
    const minAmount = expectedAmount * (1 - slippageTolerance / 100);
    return parseUnits(
      minAmount.toFixed(toToken?.decimals || 18),
      toToken?.decimals || 18,
    );
  };

  const amountIn = getAmountIn();
  const minAmountOut = calculateMinAmountOut();

  const {
    data: swapResult,
    writeContract,
    isPending: isSwapping,
    error: swapError,
  } = useWriteContract();

  const { isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    hash: swapResult,
  });

  const isNativeETH = (symbol: string, address: string) =>
    symbol === 'ETH' ||
    address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  const execute = () => {
    const path = [fromToken.address, toToken.address];
    const isFromETH = isNativeETH(fromToken.symbol, fromToken.address);
    const isToETH = isNativeETH(toToken.symbol, toToken.address);

    let functionName: string;
    let args: any[];
    let txOverrides: any = { chainId: chain?.id };

    if (isFromETH) {
      functionName = 'swapExactETHForTokens';
      args = [minAmountOut, path, recipient, BigInt(deadline)];
      txOverrides = {
        ...txOverrides,
        value: amountIn,
      };
    } else if (isToETH) {
      functionName = 'swapExactTokensForETH';
      args = [amountIn, minAmountOut, path, recipient, BigInt(deadline)];
    } else {
      functionName = 'swapExactTokensForTokens';
      args = [amountIn, minAmountOut, path, recipient, BigInt(deadline)];
    }

    console.log('Swap Params:', {
      functionName,
      from: fromToken.symbol,
      to: toToken.symbol,
      amountIn: amountIn.toString(),
      minAmountOut: minAmountOut.toString(),
      path,
    });

    writeContract({
      address: SWAP_ROUTER_ADDRESS as `0x${string}`,
      abi: SWAP_ABI,
      functionName,
      args,
      ...txOverrides,
    });
  };

  return {
    isSwapping,
    isSwapSuccess,
    execute,
    error: swapError,
  };
}

export function getDeadlineTimestamp(minutes: number): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}
