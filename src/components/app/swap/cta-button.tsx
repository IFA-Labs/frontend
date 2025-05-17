'use client';

import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useEffect, useState, CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface SwapCTAButtonProps {
  inputAmount: string;
  isCheckingDetails: boolean;
  proceedDetails: {
    canProceed: boolean;
    message: string;
  };
  isExecutingSwap: boolean;
  onProceed: () => void;
  onConnectWalletClick?: () => void;
  fromTokenSymbol?: string;
  toTokenSymbol?: string;
}

export function SwapCTAButton({
  inputAmount,
  isCheckingDetails,
  proceedDetails,
  isExecutingSwap,
  onProceed,
  onConnectWalletClick,
  fromTokenSymbol = 'tokens',
  toTokenSymbol = 'tokens',
}: SwapCTAButtonProps) {
  const { isConnected } = useAccount();
  const appKit = useAppKit();
  const [mounted, setMounted] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');
  const [swapToastId, setSwapToastId] = useState<string | null>(null);
  const { showToast, updateToast, hideToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isExecutingSwap) {
      const interval = setInterval(() => {
        setLoadingDots((prev) => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 400);
      return () => clearInterval(interval);
    }
    return () => setLoadingDots('');
  }, [isExecutingSwap]);

  useEffect(() => {
    if (isExecutingSwap && !swapToastId) {
      const id = showToast({
        type: 'loading',
        title: 'Processing Transaction',
        message: `Swapping ${inputAmount} ${fromTokenSymbol} to ${toTokenSymbol}...`,
        duration: 0, // Don't auto-dismiss for loading states
      });
      setSwapToastId(id);
    } else if (!isExecutingSwap && swapToastId) {
      updateToast(swapToastId, {
        type: 'success',
        title: 'Transaction Complete',
        message: `Successfully swapped ${inputAmount} ${fromTokenSymbol} to ${toTokenSymbol}`,
        duration: 5000,
        actionLabel: 'View Transaction',
        onAction: () => {
          console.log('View transaction clicked');
        },
      });

      setSwapToastId(null);
    }

    return () => {
      if (swapToastId) {
        hideToast(swapToastId);
        setSwapToastId(null);
      }
    };
  }, [
    isExecutingSwap,
    swapToastId,
    inputAmount,
    fromTokenSymbol,
    toTokenSymbol,
  ]);

  const handleOpenConnectModal = () => {
    if (onConnectWalletClick) {
      onConnectWalletClick();
    } else if (appKit?.open) {
      appKit.open();
    } else {
      console.error(
        'Reown AppKit modal control is not available. Ensure ContextProvider is set up.',
      );
    }
  };

  const handleProceed = () => {
    if (proceedDetails.message === 'Approve') {
      showToast({
        type: 'info',
        title: 'Approval Required',
        message: `Please approve access to your ${fromTokenSymbol} in your wallet`,
        duration: 7000,
      });
    }

    onProceed();
  };

  const baseButtonStyle: CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: '500',
    borderRadius: '64px',
    border: 'none',
    cursor: 'pointer',
    transition: '0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const disabledButtonStyle: CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#ffffff6a',
    color: '#151515',
    cursor: 'not-allowed',
    fontWeight: '500',
  };

  const enabledButtonStyle: CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#E6DAFE',
    color: '#151515',
    fontWeight: '500',
  };

  const errorButtonStyle: CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: '#A9484D',
    color: 'white',
    cursor: 'not-allowed',
    fontWeight: '500',
  };

  const processingButtonStyle: CSSProperties = {
    ...disabledButtonStyle,
    backgroundColor: '#E6DAFE80', // Semi-transparent version of the enabled button
  };

  if (!mounted) {
    return (
      <button style={disabledButtonStyle} disabled>
        <Loader2 className="animate-spin" size={20} />
        <span>Loading...</span>
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button style={enabledButtonStyle} onClick={handleOpenConnectModal}>
        Connect Wallet
      </button>
    );
  }

  if (isExecutingSwap) {
    return (
      <button style={processingButtonStyle} disabled>
        <Loader2 className="animate-spin" size={20} />
        <span>Processing Swap{loadingDots}</span>
      </button>
    );
  }

  const hasInputAmount = inputAmount && parseFloat(inputAmount) > 0;
  if (hasInputAmount && isCheckingDetails) {
    return (
      <button style={disabledButtonStyle} disabled>
        <Loader2 className="animate-spin" size={20} />
        <span>Loading...</span>
      </button>
    );
  }

  if (!hasInputAmount) {
    return (
      <button style={disabledButtonStyle} disabled>
        Enter an amount
      </button>
    );
  }

  if (proceedDetails.canProceed) {
    return (
      <button style={enabledButtonStyle} onClick={handleProceed}>
        {proceedDetails.message}
      </button>
    );
  } else {
    return (
      <button
        style={
          proceedDetails.message === 'Insufficient balance'
            ? errorButtonStyle
            : disabledButtonStyle
        }
        disabled
        title={proceedDetails.message}
      >
        {proceedDetails.message}
      </button>
    );
  }
}
