/**
 * Token Vault - Cross-platform token storage abstraction
 * 
 * Automatically uses the appropriate storage method:
 * - Desktop (Tauri): Stronghold secure vault
 * - Web: No-op (tokens in-memory only for security)
 * 
 * Usage:
 * ```typescript
 * import { tokenVault } from '@/auth/tokenVault';
 * 
 * // Store refresh token (desktop only)
 * await tokenVault.setRefreshToken(token);
 * 
 * // Retrieve refresh token
 * const token = await tokenVault.getRefreshToken();
 * 
 * // Clear on logout
 * await tokenVault.clear();
 * ```
 */

// Detect if running in Tauri (desktop)
const IS_TAURI = typeof window !== 'undefined' && Boolean((window as any).__TAURI__);

/**
 * Token vault interface
 */
export interface ITokenVault {
  setRefreshToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  clear(): Promise<void>;
  hasRefreshToken(): Promise<boolean>;
}

/**
 * No-op implementation for web (security: no token persistence)
 */
const webVault: ITokenVault = {
  async setRefreshToken(_token: string): Promise<void> {
    console.log('[TokenVault] Web mode: refresh tokens not persisted (security policy)');
  },

  async getRefreshToken(): Promise<string | null> {
    return null;
  },

  async clear(): Promise<void> {
    // No-op
  },

  async hasRefreshToken(): Promise<boolean> {
    return false;
  },
};

/**
 * Lazy-loaded desktop vault (Stronghold)
 * 
 * Only loads the desktop implementation when running in Tauri.
 * This prevents bundling Tauri-specific code in web builds.
 */
let desktopVault: ITokenVault | null = null;

async function getDesktopVault(): Promise<ITokenVault> {
  if (!desktopVault) {
    const { tokenVault: vault } = await import('./tokenVault.desktop');
    desktopVault = vault;
  }
  return desktopVault;
}

/**
 * Token Vault (Platform-aware)
 * 
 * Uses Stronghold on desktop, no-op on web.
 */
export const tokenVault: ITokenVault = {
  async setRefreshToken(token: string): Promise<void> {
    if (IS_TAURI) {
      const vault = await getDesktopVault();
      return vault.setRefreshToken(token);
    }
    return webVault.setRefreshToken(token);
  },

  async getRefreshToken(): Promise<string | null> {
    if (IS_TAURI) {
      const vault = await getDesktopVault();
      return vault.getRefreshToken();
    }
    return webVault.getRefreshToken();
  },

  async clear(): Promise<void> {
    if (IS_TAURI) {
      const vault = await getDesktopVault();
      return vault.clear();
    }
    return webVault.clear();
  },

  async hasRefreshToken(): Promise<boolean> {
    if (IS_TAURI) {
      const vault = await getDesktopVault();
      return vault.hasRefreshToken();
    }
    return webVault.hasRefreshToken();
  },
};

/**
 * Check if running on desktop (Tauri)
 */
export function isDesktop(): boolean {
  return IS_TAURI;
}
