/**
 * Session event handling utilities
 * 
 * Prevents duplicate 401 redirects when multiple API calls fail simultaneously
 * 
 * Enterprise pattern:
 * - Only one redirect per session expiry
 * - Coordinated cleanup before redirect
 * - Reset after redirect completes
 */

let handling401 = false;

/**
 * Begin handling a 401 response
 * 
 * @returns true if this is the first 401 handler, false if already handling
 */
export function beginHandle401(): boolean {
  if (handling401) {
    return false; // Already handling, ignore duplicate
  }
  handling401 = true;
  return true; // This is the first handler
}

/**
 * Reset 401 handling state
 * 
 * Call this after redirect completes or on a timer
 */
export function resetHandle401(): void {
  handling401 = false;
}

/**
 * Check if currently handling a 401 response
 * 
 * Useful for debugging or conditional logic
 */
export function isHandling401(): boolean {
  return handling401;
}
