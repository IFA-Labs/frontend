'use client';

import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useEffect, useState, CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface SwapCTAButtonProps {
  /** The amount entered by the user for the 'from' token. Empty or '0' means no amount. */
  inputAmount: string;
  /** True when the parent page is checking balance, gas, approvals, etc. (State three) */
  isCheckingDetails: boolean;
  /** Details about whether the user can proceed or why not (State four) */
  proceedDetails: {
    canProceed: boolean;
    message: string; // e.g., "Proceed", "Insufficient balance", "Select a token"
  };
  /** True when the swap transaction has been sent and is awaiting confirmation. */
  isExecutingSwap: boolean;
  /** Function to call when the button is in a "Proceed" state and clicked. */
  onProceed: () => void;
  /** Optional: Custom action for connecting wallet, defaults to opening Reown AppKit modal. */
  onConnectWalletClick?: () => void;
  /** Optional: Tokens being swapped for notification messages */
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

  // Effect for animated loading dots
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

  // Effect for showing toast notifications during swap execution
  useEffect(() => {
    if (isExecutingSwap && !swapToastId) {
      // Show the initial loading toast when swap starts
      const id = showToast({
        type: 'loading',
        title: 'Processing Transaction',
        message: `Swapping ${inputAmount} ${fromTokenSymbol} to ${toTokenSymbol}...`,
        duration: 0, // Don't auto-dismiss for loading states
      });
      setSwapToastId(id);
    } else if (!isExecutingSwap && swapToastId) {
      // When swap finishes, update the toast with success
      // In a real implementation, you'd want to check if it was successful or failed
      updateToast(swapToastId, {
        type: 'success',
        title: 'Transaction Complete',
        message: `Successfully swapped ${inputAmount} ${fromTokenSymbol} to ${toTokenSymbol}`,
        duration: 5000, // Auto-dismiss after 5 seconds
        actionLabel: 'View Transaction',
        onAction: () => {
          // Here you could open the transaction in a block explorer
          console.log('View transaction clicked');
        },
      });

      // Reset the toast ID after updating
      setSwapToastId(null);
    }

    // Clean up toast if component unmounts during transaction
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
    // If this is an approval step, show a different toast
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

  // Avoid rendering wallet-dependent UI until component is mounted (for SSR/hydration)
  if (!mounted) {
    return (
      <button style={disabledButtonStyle} disabled>
        <Loader2 className="animate-spin" size={20} />
        <span>Loading...</span>
      </button>
    );
  }

  // State One: User hasn't connected their wallet
  if (!isConnected) {
    return (
      <button style={enabledButtonStyle} onClick={handleOpenConnectModal}>
        Connect Wallet
      </button>
    );
  }

  // --- Wallet is Connected from this point onwards ---

  // Bonus State: Swap is currently executing (transaction sent, awaiting confirmation)
  if (isExecutingSwap) {
    return (
      <button style={processingButtonStyle} disabled>
        <Loader2 className="animate-spin" size={20} />
        <span>Processing Swap{loadingDots}</span>
      </button>
    );
  }

  // State Three: Loading to see if user has enough balance/gas
  // (inputAmount should be present for this check to be relevant)
  const hasInputAmount = inputAmount && parseFloat(inputAmount) > 0;
  if (hasInputAmount && isCheckingDetails) {
    return (
      <button style={disabledButtonStyle} disabled>
        <Loader2 className="animate-spin" size={20} />
        <span>Loading...</span>
      </button>
    );
  }

  // State Two: User hasn't entered an amount
  if (!hasInputAmount) {
    return (
      <button style={disabledButtonStyle} disabled>
        Enter an amount
      </button>
    );
  }

  // State Four: Status has been confirmed (either "Insufficient balance" or "Proceed")
  // This state is reached if:
  // - Wallet is connected
  // - Swap is NOT executing
  // - Details are NOT being checked (isCheckingDetails is false)
  // - An input amount IS present
  if (proceedDetails.canProceed) {
    return (
      <button style={enabledButtonStyle} onClick={handleProceed}>
        {proceedDetails.message} {/* e.g., "Proceed" */}
      </button>
    );
  } else {
    // Cannot proceed (e.g., "Insufficient balance", "Select a token", etc.)
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
