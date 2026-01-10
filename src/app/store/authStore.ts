import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Enterprise auth state contract
 * 
 * Rules:
 * - roles must come from decoded JWT, not hardcoded
 * - tenantId must come from decoded JWT
 * - UI must never assume roles based on route or module
 */
type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  tenantId: string | null;
  roles: string[];
  userId: string | null;
  
  setAuth: (payload: {
    accessToken: string;
    tenantId: string;
    roles: string[];
    userId: string;
  }) => void;
  
  clearAuth: () => void;
};

const initialState = {
  isAuthenticated: false,
  accessToken: null,
  tenantId: null,
  roles: [],
  userId: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (payload) =>
        set({
          isAuthenticated: true,
          accessToken: payload.accessToken,
          tenantId: payload.tenantId,
          roles: payload.roles,
          userId: payload.userId,
        }),

      clearAuth: () => set(initialState),
    }),
    {
      name: 'lexa-auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        // accessToken is stored but will be validated on app load
        accessToken: state.accessToken,
        // These are safe to persist as they come from JWT
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
