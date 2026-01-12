/**
 * useDeepLink Hook
 * 
 * Listens for deep link events in Tauri desktop app
 * Used for OAuth callback handling (lexa-ledger://auth/callback)
 */

import { useEffect } from 'react';

// Type guard to check if we're in Tauri
const IS_TAURI = typeof window !== 'undefined' && Boolean((window as any).__TAURI__);

export function useDeepLink(onDeepLink: (url: string) => void | Promise<void>) {
  useEffect(() => {
    if (!IS_TAURI) {
      console.log('[useDeepLink] Not in Tauri environment, skipping');
      return;
    }

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        // Dynamically import Tauri APIs
        const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
        
        // Listen for deep link events
        unlisten = await onOpenUrl((urls) => {
          if (urls && urls.length > 0) {
            const url = urls[0];
            console.log('[useDeepLink] Received deep link:', url);
            
            // Call the callback (can be async)
            const result = onDeepLink(url);
            if (result && typeof result.then === 'function') {
              result.catch((err) => {
                console.error('[useDeepLink] Callback error:', err);
              });
            }
          }
        });

        console.log('[useDeepLink] Listener registered');
      } catch (error) {
        console.error('[useDeepLink] Failed to setup listener:', error);
      }
    };

    setupListener();

    // Cleanup
    return () => {
      if (unlisten) {
        console.log('[useDeepLink] Cleaning up listener');
        unlisten();
      }
    };
  }, [onDeepLink]);
}
