import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildKeycloakLoginUrl, buildKeycloakLogoutUrl, decodeJwt } from "../config/keycloak";
import { tokenVault } from "../../auth/tokenVault";

/**
 * Enterprise auth state contract
 *
 * Rules:
 * - roles must come from decoded JWT, not hardcoded
 * - tenantId must come from decoded JWT
 * - UI must never assume roles based on route or module
 * - isAuthenticated is computed from token validity, not stored
 * 
 * Week 2.5 - C3 Security Posture:
 * - accessToken NOT persisted on web (security best practice)
 * - accessToken CAN be persisted in Tauri (desktop) using OS keychain
 * - Identity fields (tenantId, userId, roles) still persisted for UX
 * 
 * Week 2.5 - D1 Desktop Security (Stronghold):
 * - Refresh tokens stored in Stronghold vault (desktop only)
 * - Stronghold uses Argon2 password derivation + encrypted storage
 * - Vault password stored in plugin-store (future: OS keychain)
 */

/**
 * Detect if running in Tauri (desktop app)
 */
const IS_TAURI = typeof window !== 'undefined' && Boolean((window as any).__TAURI__);

/**
 * Determine if we should persist access tokens
 * Web: No (security - tokens in localStorage are a risk)
 * Desktop (Tauri): Yes (OS keychain is secure)
 */
const SHOULD_PERSIST_TOKEN = IS_TAURI;

/**
 * Helper to check if a token is valid (not expired)
 */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return decoded.exp > nowSec;
}

type AuthState = {
  // Persisted state (from JWT)
  accessToken: string | null;
  tenantId: string | null;
  roles: string[];
  userId: string | null;
  userEmail: string | null;
  userName: string | null;

  // Actions
  setAuth: (payload: {
    accessToken: string;
    tenantId: string;
    roles: string[];
    userId: string;
    userEmail?: string;
    userName?: string;
  }) => void;

  clearAuth: () => void;

  /**
   * Initiate Keycloak SSO login flow (web)
   * Redirects to Keycloak authorization endpoint
   */
  beginLogin: () => void;

  /**
   * Initiate Keycloak SSO login flow (desktop)
   * Opens system browser for authentication
   */
  beginDesktopLogin: () => void;

  /**
   * Complete login after OAuth callback
   * Decodes JWT and populates auth state
   */
  completeLogin: (accessToken: string) => void;

  /**
   * Logout and redirect to Keycloak logout endpoint
   */
  logout: () => void;

  /**
   * Computed: check if user is authenticated with valid token
   */
  isAuthenticated: () => boolean;
};

const initialState = {
  accessToken: null,
  tenantId: null,
  roles: [] as string[],
  userId: null,
  userEmail: null,
  userName: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (payload) =>
        set({
          accessToken: payload.accessToken,
          tenantId: payload.tenantId,
          roles: payload.roles,
          userId: payload.userId,
          userEmail: payload.userEmail || null,
          userName: payload.userName || null,
        }),

      clearAuth: () => set(initialState),

      isAuthenticated: () => {
        const state = get();
        return (
          state.accessToken !== null &&
          state.tenantId !== null &&
          state.userId !== null &&
          isTokenValid(state.accessToken)
        );
      },

      beginLogin: () => {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const loginUrl = buildKeycloakLoginUrl(redirectUri);
        window.location.href = loginUrl;
      },

      beginDesktopLogin: async () => {
        const redirectUri = 'lexa-ledger://auth/callback';
        const loginUrl = buildKeycloakLoginUrl(redirectUri);
        
        try {
          // Open system browser (not embedded webview)
          const opener = await import('@tauri-apps/plugin-opener');
          if (opener && typeof opener === 'object' && 'open' in opener) {
            await (opener as any).open(loginUrl);
          } else {
            // Fallback: use window.open for web compatibility
            window.open(loginUrl, '_blank');
          }
          console.log('[AuthStore] Opened system browser for login');
        } catch (error) {
          console.error('[AuthStore] Failed to open system browser:', error);
          // Fallback: use window.open
          window.open(loginUrl, '_blank');
        }
      },

      completeLogin: (accessToken: string) => {
        const decoded = decodeJwt(accessToken);

        if (!decoded) {
          console.error("Failed to decode access token");
          return;
        }

        // Extract claims from JWT
        const tenantId = decoded.tenant_id || decoded.tenantId;
        const userId = decoded.sub;
        const roles = decoded.realm_access?.roles || [];
        const userEmail = decoded.email;
        const userName = decoded.name || decoded.preferred_username;

        set({
          accessToken,
          tenantId,
          userId,
          roles,
          userEmail,
          userName,
        });
      },

      logout: async () => {
        // Clear local state
        set(initialState);

        // Clear secure token vault (desktop only)
        // This removes refresh tokens from Stronghold
        try {
          await tokenVault.clear();
          console.log('[AuthStore] Token vault cleared');
        } catch (error) {
          console.error('[AuthStore] Failed to clear token vault:', error);
        }

        // Redirect to Keycloak logout
        const redirectUri = `${window.location.origin}/login`;
        const logoutUrl = buildKeycloakLogoutUrl(redirectUri);
        window.location.href = logoutUrl;
      },
    }),
    {
      name: "lexa-auth-storage",
      partialize: (state) => ({
        // C3 Security: accessToken only persisted on desktop (Tauri)
        // On web, token stays in-memory only (cleared on page refresh)
        ...(SHOULD_PERSIST_TOKEN ? { accessToken: state.accessToken } : {}),
        
        // Identity fields always persisted for UX (safe, non-sensitive)
        tenantId: state.tenantId,
        userId: state.userId,
        roles: state.roles,
        userEmail: state.userEmail,
        userName: state.userName,
        // isAuthenticated is derived, not persisted
      }),
    }
  )
);
