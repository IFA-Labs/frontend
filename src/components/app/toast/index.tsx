'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Define toast types and positions
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

// Toast item interface
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

// Context interface
interface ToastContextType {
  showToast: (params: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  updateToast: (id: string, params: Partial<Omit<Toast, 'id'>>) => void;
}

// Create context with default values
export const ToastContext = createContext<ToastContextType>({
  showToast: () => '',
  hideToast: () => {},
  clearToasts: () => {},
  updateToast: () => {},
});

// Provider props
interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
  position?: ToastPosition;
  className?: string;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
  position = 'top-right',
  className = '',
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show toast function
  const showToast = (params: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: defaultDuration,
      ...params,
    };

    setToasts((prev) => {
      // If we're at max capacity, remove the oldest toast
      if (prev.length >= maxToasts) {
        return [...prev.slice(1), newToast];
      }
      return [...prev, newToast];
    });

    return id;
  };

  // Hide toast function
  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Clear all toasts function
  const clearToasts = () => {
    setToasts([]);
  };

  // Update existing toast
  const updateToast = (id: string, params: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === id ? { ...toast, ...params } : toast)),
    );
  };

  return (
    <ToastContext.Provider
      value={{ showToast, hideToast, clearToasts, updateToast }}
    >
      {children}
      <ToastContainer
        toasts={toasts}
        hideToast={hideToast}
        position={position}
        className={className}
      />
    </ToastContext.Provider>
  );
};

// Toast container component
interface ToastContainerProps {
  toasts: Toast[];
  hideToast: (id: string) => void;
  position: ToastPosition;
  className?: string;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  hideToast,
  position,
  className,
}) => {
  // Position styling
  const getPositionClass = (pos: ToastPosition) => {
    switch (pos) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
    }
  };

  const positionClass = getPositionClass(position);

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${positionClass} ${className}`}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Individual toast component
interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const { id, type, title, message, duration, onAction, actionLabel } = toast;

  // Auto-dismiss effect
  useEffect(() => {
    if (duration && duration > 0 && type !== 'loading') {
      const timer = setTimeout(() => {
        onClose();
        toast.onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose, toast, type]);

  // Icon based on type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  // Background color based on type
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'loading':
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`rounded-lg shadow-lg p-4 min-w-72 max-w-md border ${getBgColor()} animate-fade-in-right`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className="mt-1 text-sm text-gray-700">{message}</div>

          {actionLabel && onAction && (
            <div className="mt-2">
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {
                  onAction();
                  onClose();
                }}
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          onClick={() => {
            onClose();
            toast.onClose?.();
          }}
        >
          <span className="sr-only">Close</span>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Custom hook to use the toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// CSS Animations (add to your global CSS or include here)
const styles = `
@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fade-in-right {
  animation: fadeInRight 0.3s ease-out forwards;
}
`;
