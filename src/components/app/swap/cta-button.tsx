// components/SwapCTAButton.tsx
'use client';

import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useEffect, useState, CSSProperties } from 'react';

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
}

export function SwapCTAButton({
  inputAmount,
  isCheckingDetails,
  proceedDetails,
  isExecutingSwap,
  onProceed,
  onConnectWalletClick,
}: SwapCTAButtonProps) {
  const { isConnected } = useAccount();
  const appKit = useAppKit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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


  const baseButtonStyle: CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    fontSize: '1rem',
    fontWeight: '500',
    borderRadius: '64px',
    border: 'none',
    cursor: 'pointer',
    transition: ' 0.2s ease-in-out',
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
    backgroundColor: '#E20613',
    color: 'white',
    cursor: 'not-allowed',
  };

  // Avoid rendering wallet-dependent UI until component is mounted (for SSR/hydration)
  if (!mounted) {
    return (
      <button style={disabledButtonStyle} disabled>
        Loading...
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
      <button style={disabledButtonStyle} disabled>
        Processing Swap...
      </button>
    );
  }

  // State Three: Loading to see if user has enough balance/gas
  // (inputAmount should be present for this check to be relevant)
  const hasInputAmount = inputAmount && parseFloat(inputAmount) > 0;
  if (hasInputAmount && isCheckingDetails) {
    return (
      <button style={disabledButtonStyle} disabled>
        Loading...
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
      <button style={enabledButtonStyle} onClick={onProceed}>
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
        title="insufficient balance"
      >
        {proceedDetails.message}
      </button>
    );
  }
}
