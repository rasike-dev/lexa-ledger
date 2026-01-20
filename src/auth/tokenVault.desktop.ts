/**
 * Token Vault (Desktop Only) - Secure token storage using Stronghold
 * 
 * Week 2.5 - Step D1: Enterprise desktop security
 * 
 * Architecture:
 * - Stronghold: Encrypted vault for sensitive data (refresh tokens)
 * - Store: Plain storage for non-sensitive preferences (vault password)
 * 
 * Security notes:
 * - Stronghold encrypts data using password-derived keys (Argon2)
 * - Vault password is per-install (generated once, stored in plugin-store)
 * - For production: Store vault password in OS keychain (future enhancement)
 * 
 * Usage:
 * - tokenVault.setRefreshToken(token) - Store refresh token securely
 * - tokenVault.getRefreshToken() - Retrieve refresh token
 * - tokenVault.clear() - Remove refresh token (logout)
 */

import { Stronghold, Client } from "@tauri-apps/plugin-stronghold";
import { appDataDir } from "@tauri-apps/api/path";
import { Store } from "@tauri-apps/plugin-store";

const CLIENT_NAME = "lexa-ledger";
const REFRESH_KEY = "oidc.refresh_token";

// Non-sensitive preference store (for vault password)
// NOTE: For hackathon/demo, vault password is stored here for persistence.
// Best practice: store vault password in OS keychain (keytar, etc.)
let PREFS: Store | null = null;
const VAULT_PW_KEY = "stronghold.vault_password";

async function getPrefsStore(): Promise<Store> {
  if (!PREFS) {
    PREFS = await Store.load("prefs.json");
  }
  return PREFS;
}

/**
 * Get or create vault password (per-install secret)
 * 
 * This password is used to encrypt/decrypt the Stronghold vault.
 * For demo purposes, it's stored in plugin-store.
 * 
 * Future enhancement: Use OS keychain for vault password.
 */
async function getOrCreateVaultPassword(): Promise<string> {
  const prefs = await getPrefsStore();
  const existing = await prefs.get<string>(VAULT_PW_KEY);
  if (existing) {
    return existing;
  }

  // Generate new per-install password
  const pw = crypto.randomUUID();
  await prefs.set(VAULT_PW_KEY, pw);
  await prefs.save();
  
  console.log('[TokenVault] Generated new vault password');
  return pw;
}

/**
 * Initialize Stronghold vault and client
 * 
 * Creates/loads vault file and client for storing secrets.
 */
async function initStronghold() {
  const vaultPath = `${await appDataDir()}/lexa.vault.hold`;
  const vaultPassword = await getOrCreateVaultPassword();

  const stronghold = await Stronghold.load(vaultPath, vaultPassword);

  let client: Client;
  try {
    client = await stronghold.loadClient(CLIENT_NAME);
  } catch {
    client = await stronghold.createClient(CLIENT_NAME);
  }

  const store = client.getStore();
  return { stronghold, store };
}

/**
 * Token Vault API
 * 
 * Secure storage for refresh tokens on desktop.
 */
export const tokenVault = {
  /**
   * Store refresh token securely in Stronghold
   * 
   * @param token - OIDC refresh token
   */
  async setRefreshToken(token: string): Promise<void> {
    try {
      const { stronghold, store } = await initStronghold();
      
      // Convert string to byte array for Stronghold
      const data = Array.from(new TextEncoder().encode(token));
      await store.insert(REFRESH_KEY, data);
      await stronghold.save();
      
      console.log('[TokenVault] Refresh token stored securely');
    } catch (error) {
      console.error('[TokenVault] Failed to store refresh token:', error);
      throw error;
    }
  },

  /**
   * Retrieve refresh token from Stronghold
   * 
   * @returns Refresh token or null if not found
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const { store } = await initStronghold();
      const data = await store.get(REFRESH_KEY);
      
      if (!data) {
        console.log('[TokenVault] No refresh token found');
        return null;
      }
      
      // Convert byte array back to string
      const token = new TextDecoder().decode(new Uint8Array(data));
      console.log('[TokenVault] Refresh token retrieved');
      return token;
    } catch (error) {
      console.error('[TokenVault] Failed to retrieve refresh token:', error);
      return null;
    }
  },

  /**
   * Clear refresh token from Stronghold (logout)
   */
  async clear(): Promise<void> {
    try {
      const { stronghold, store } = await initStronghold();
      await store.remove(REFRESH_KEY);
      await stronghold.save();
      
      console.log('[TokenVault] Refresh token cleared');
    } catch (error) {
      console.error('[TokenVault] Failed to clear refresh token:', error);
      throw error;
    }
  },

  /**
   * Check if refresh token exists (without retrieving it)
   * 
   * @returns true if refresh token is stored
   */
  async hasRefreshToken(): Promise<boolean> {
    try {
      const token = await this.getRefreshToken();
      return token !== null;
    } catch {
      return false;
    }
  },
};
