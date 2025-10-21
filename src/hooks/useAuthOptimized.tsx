import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Optimized hook that memoizes auth-related computations
 * to prevent unnecessary re-renders
 */
export function useAuthOptimized() {
  const auth = useAuth();
  
  const memoizedAuth = useMemo(() => ({
    user: auth.user,
    isLoading: auth.isLoading,
    hasRole: auth.hasRole,
    signOut: auth.signOut,
    userRoles: auth.user?.user_metadata?.role || [],
  }), [auth.user, auth.isLoading, auth.hasRole, auth.signOut]);
  
  return memoizedAuth;
}
