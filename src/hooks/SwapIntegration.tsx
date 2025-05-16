'use client';

import { parseUnits, formatUnits } from 'viem';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useState, useEffect } from 'react';

// Contract ABIs - these would need to be imported from your contract ABI files
import { IfaSwapRouterABI } from '@/lib/abis/swap-router-abi';
import { ERC20ABI } from '@/lib/abis/erc20-abi';

// Contract addresses from your deployment
const ROUTER_ADDRESS = '0xcd6ceef9081622e5d59c54b7569e0979494dc207';
const FACTORY_ADDRESS = '0x045A543FFf5D816fBA83F8af069a13877C5E6a4B';

// Interface for token approval and swap functions
export interface SwapExecutionProps {
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  fromAmount: string;
  slippageTolerance: number; // e.g., 0.5 for 0.5%
  deadline: number; // Unix timestamp deadline
  recipient: `0x${string}`; // User address
}

interface ApprovalResult {
  isApproved: boolean;
  isApproving: boolean;
  error: Error | null;
  approve: () => void;
}

interface SwapResult {
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: any;
  execute: () => void;
}

/**
 * Hook to check and execute token approval
 */
export function useTokenApproval(
  tokenAddress: string | undefined,
  spenderAddress: string | undefined,
  amount: string,
  decimals: number,
): ApprovalResult {
  // Skip if addresses are missing
  const enabled =
    !!tokenAddress &&
    !!spenderAddress &&
    amount !== '' &&
    parseFloat(amount) > 0;

  // Convert amount to token units
  const amountInWei = enabled ? parseUnits(amount, decimals) : BigInt(0);

  // Check allowance
  const { data: allowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [spenderAddress as `0x${string}`, ROUTER_ADDRESS as `0x${string}`],
    query: {
      enabled,
      refetchInterval: 10000,
    },
  });

  // Execute approval transaction
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
    if (!tokenAddress || !spenderAddress || !enabled) return;
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS as `0x${string}`, amountInWei],
    });
  };

  // Determine if token is approved
  const isApproved =
    enabled &&
    !!allowance &&
    (amountInWei <= (allowance as bigint) || isApprovalSuccess);

  return {
    isApproved,
    isApproving,
    error: writeError,
    approve,
  };
}

/**
 * Hook to execute token swap
 */
export function useSwapExecution({
  fromToken,
  toToken,
  fromAmount,
  slippageTolerance,
  deadline,
  recipient,
}: SwapExecutionProps): SwapResult {
  // States for the swap operation
  const [expectedOutput, setExpectedOutput] = useState<bigint>(BigInt(0));
  const [minAmountOut, setMinAmountOut] = useState<bigint>(BigInt(0));
  const [isReady, setIsReady] = useState(false);

  const enabled =
    !!fromToken?.address &&
    !!toToken?.address &&
    fromAmount !== '' &&
    parseFloat(fromAmount) > 0;

  // Convert amount to token units
  const amountInWei = enabled
    ? parseUnits(fromAmount, fromToken.decimals)
    : BigInt(0);

  // Create path for swap
  const path = [
    fromToken?.address as `0x${string}`,
    toToken?.address as `0x${string}`,
  ];

  // Get expected output amount
  const { data: amountsOut, isSuccess: isAmountsOutSuccess } = useReadContract({
    address: ROUTER_ADDRESS as `0x${string}`,
    abi: IfaSwapRouterABI,
    functionName: 'getAmountsOut',
    args: [amountInWei, path],
    query: {
      enabled,
      refetchInterval: 10000,
    },
  });

  // Calculate minimum amount out based on slippage
  useEffect(() => {
    if (
      isAmountsOutSuccess &&
      amountsOut &&
      Array.isArray(amountsOut) &&
      amountsOut.length > 1
    ) {
      const outputAmount = amountsOut[1] as bigint;
      setExpectedOutput(outputAmount);

      // Calculate minimum output with slippage
      const slippageFactor = 1000 - slippageTolerance * 10; // e.g., 0.5% -> 995
      const minOutput = (outputAmount * BigInt(slippageFactor)) / BigInt(1000);
      setMinAmountOut(minOutput);
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [amountsOut, isAmountsOutSuccess, slippageTolerance]);

  // Execute swap transaction
  const {
    data: swapResult,
    writeContract,
    isPending,
    error: swapError,
  } = useWriteContract();

  const { isSuccess } = useWaitForTransactionReceipt({
    hash: swapResult,
  });

  const execute = () => {
    if (!isReady || !enabled) return;
    writeContract({
      address: ROUTER_ADDRESS as `0x${string}`,
      abi: IfaSwapRouterABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountInWei, minAmountOut, path, recipient, BigInt(deadline)],
    });
  };

  return {
    isLoading: isPending,
    isPending,
    isSuccess,
    error: swapError,
    data: swapResult,
    execute,
  };
}

export function getDeadlineTimestamp(minutes: number): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}
