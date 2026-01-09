'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useToast } from '@/components/Toast';
import { useNetworkError } from '@/hooks/useNetworkError';

interface ErrorContextType {
  handleError: (error: any, context?: string) => void;
  executeWithRetry: <T>(operation: () => Promise<T>, operationName?: string) => Promise<T>;
  isRetrying: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const { showError, showWarning } = useToast();
  const { executeWithRetry, isRetrying } = useNetworkError({
    maxRetries: 2,
    retryDelay: 1000,
    showToast: false // We'll handle toasts manually for better control
  });

  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    // Determine error type and show appropriate message
    let title = 'Error';
    let message = 'An unexpected error occurred.';

    if (error?.isNetworkError) {
      title = 'Connection Error';
      if (error?.isTimeoutError) {
        message = 'The request timed out. Please check your connection and try again.';
      } else {
        message = 'Unable to connect to the server. Please check your internet connection.';
      }
    } else if (error?.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.error?.message;

      switch (status) {
        case 400:
          title = 'Invalid Request';
          message = serverMessage || 'The request contains invalid data.';
          break;
        case 401:
          title = 'Authentication Required';
          message = 'Please log in to continue.';
          break;
        case 403:
          title = 'Access Denied';
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          title = 'Not Found';
          message = serverMessage || 'The requested resource was not found.';
          break;
        case 409:
          title = 'Conflict';
          message = serverMessage || 'There was a conflict with the current state.';
          break;
        case 422:
          title = 'Validation Error';
          message = serverMessage || 'The provided data is invalid.';
          break;
        case 429:
          title = 'Too Many Requests';
          message = 'Please wait a moment before trying again.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          title = 'Server Error';
          message = 'A server error occurred. Please try again later.';
          break;
        default:
          title = 'Error';
          message = serverMessage || 'An unexpected error occurred.';
      }
    } else if (error?.message) {
      message = error.message;
    }

    // Add context to the message if provided
    if (context) {
      message = `${message} (${context})`;
    }

    showError(title, message);
  }, [showError]);

  const executeWithRetryAndToast = useCallback((
    operation: () => Promise<any>,
    operationName?: string
  ): Promise<any> => {
    return executeWithRetry(operation, operationName).catch((error) => {
      handleError(error, operationName);
      throw error;
    });
  }, [executeWithRetry, handleError]);

  const value: ErrorContextType = {
    handleError,
    executeWithRetry: executeWithRetryAndToast,
    isRetrying
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

export default ErrorContext;