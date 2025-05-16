'use client';

import { parseUnits, formatUnits } from 'viem';
import {
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from 'wagmi';
import { useState, useEffect } from 'react';

// Contract ABIs - these would need to be imported from your contract ABI files
import { IfaSwapRouterABI } from '@/lib/abis/swap-router-abi';
import { ERC20ABI } from '@/lib/abis/erc20-abi';

// Contract addresses from your deployment
const ROUTER_ADDRESS = '0x4C340689308af4354704EF753c264bD1946230B8';
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

export interface ApprovalResult {
  isApproved: boolean;
  isApproving: boolean;
  error: Error | null;
  approve: () => void;
}

export interface SwapResult {
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
  const { data: allowance } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [spenderAddress as `0x${string}`, ROUTER_ADDRESS as `0x${string}`],
    enabled,
    watch: true,
  });

  // Prepare approval transaction
  const { config: approvalConfig, error: prepareError } =
    usePrepareContractWrite({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS as `0x${string}`, amountInWei],
      enabled: enabled && !!allowance && amountInWei > (allowance as bigint),
    });

  // Execute approval transaction
  const {
    write: approve,
    data: approvalData,
    isLoading: isApproving,
    error: approvalError,
  } = useContractWrite(approvalConfig);

  // Wait for transaction confirmation
  const { isSuccess: isApprovalSuccess } = useWaitForTransaction({
    hash: approvalData?.hash,
  });

  // Determine if token is approved
  const isApproved =
    enabled &&
    !!allowance &&
    (amountInWei <= (allowance as bigint) || isApprovalSuccess);

  return {
    isApproved,
    isApproving,
    error: approvalError || prepareError,
    approve: () => approve?.(),
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
  const { data: amountsOut, isSuccess: isAmountsOutSuccess } = useContractRead({
    address: ROUTER_ADDRESS as `0x${string}`,
    abi: IfaSwapRouterABI,
    functionName: 'getAmountsOut',
    args: [amountInWei, path],
    enabled,
    watch: true,
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

  // Prepare swap transaction
  const { config: swapConfig, error: prepareSwapError } =
    usePrepareContractWrite({
      address: ROUTER_ADDRESS as `0x${string}`,
      abi: IfaSwapRouterABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountInWei, minAmountOut, path, recipient, BigInt(deadline)],
      enabled: isReady && enabled,
    });

  // Execute swap transaction
  const {
    write: executeSwap,
    data: swapData,
    isLoading,
    error: swapError,
    isPending,
  } = useContractWrite(swapConfig);

  // Wait for transaction confirmation
  const { isSuccess } = useWaitForTransaction({
    hash: swapData?.hash,
  });

  return {
    isLoading,
    isPending,
    isSuccess,
    error: swapError || prepareSwapError,
    data: swapData,
    execute: () => executeSwap?.(),
  };
}

/**
 * Helper function to get current Unix timestamp plus minutes
 */
export function getDeadlineTimestamp(minutesFromNow: number = 20): number {
  return Math.floor(Date.now() / 1000) + minutesFromNow * 60;
}
