import { useState, useCallback } from 'react';
import { useToast } from '@/components/Toast';

export interface NetworkErrorOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  customErrorMessage?: string;
}

export interface NetworkErrorState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

export function useNetworkError(options: NetworkErrorOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    customErrorMessage
  } = options;

  const { showError, showWarning } = useToast();
  const [errorState, setErrorState] = useState<NetworkErrorState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setErrorState(prev => ({
          ...prev,
          isRetrying: attempt > 0,
          retryCount: attempt
        }));

        const result = await operation();
        
        // Reset error state on success
        setErrorState({
          isRetrying: false,
          retryCount: 0,
          lastError: null
        });

        return result;
      } catch (error: any) {
        lastError = error;
        
        setErrorState(prev => ({
          ...prev,
          lastError: error,
          retryCount: attempt + 1
        }));

        // Don't retry on certain error types
        if (isNonRetryableError(error)) {
          break;
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          if (showToast && attempt === 0) {
            showWarning(
              'Connection Issue',
              `Retrying ${operationName || 'operation'}... (${attempt + 1}/${maxRetries + 1})`
            );
          }
          
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    // All retries failed
    setErrorState(prev => ({
      ...prev,
      isRetrying: false
    }));

    if (showToast) {
      const errorMessage = getErrorMessage(lastError!, customErrorMessage);
      showError('Operation Failed', errorMessage);
    }

    throw lastError!;
  }, [maxRetries, retryDelay, showToast, customErrorMessage, showError, showWarning]);

  const isNonRetryableError = (error: any): boolean => {
    // Don't retry on authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return true;
    }

    // Don't retry on validation errors
    if (error.response?.status === 400 || error.response?.status === 422) {
      return true;
    }

    // Don't retry on not found errors
    if (error.response?.status === 404) {
      return true;
    }

    // Don't retry on client errors (4xx except those above)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return true;
    }

    return false;
  };

  const getErrorMessage = (error: any, customMessage?: string): string => {
    if (customMessage) {
      return customMessage;
    }

    // Network errors
    if (!error.response) {
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return 'The request timed out. Please try again.';
      }
      return 'A network error occurred. Please check your connection and try again.';
    }

    // Server errors
    const status = error.response.status;
    const serverMessage = error.response.data?.error?.message;

    if (status >= 500) {
      return serverMessage || 'A server error occurred. Please try again later.';
    }

    if (status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    return serverMessage || 'An unexpected error occurred. Please try again.';
  };

  const reset = useCallback(() => {
    setErrorState({
      isRetrying: false,
      retryCount: 0,
      lastError: null
    });
  }, []);

  return {
    executeWithRetry,
    errorState,
    reset,
    isRetrying: errorState.isRetrying
  };
}

export default useNetworkError;