import { apiClient } from '@/lib/api';

/**
 * Custom hook that provides access to the API client
 * This can be extended with additional API-related functionality
 */
export function useApi() {
  return apiClient;
}

export default useApi;