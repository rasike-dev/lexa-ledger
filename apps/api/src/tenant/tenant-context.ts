import { Injectable } from '@nestjs/common';
import { tenantALS } from './tenant-als';

/**
 * TenantContext provides access to the current request's tenant information.
 * 
 * This is a convenience wrapper around AsyncLocalStorage that provides
 * type-safe access to tenant context with helpful error messages.
 * 
 * Usage in services:
 * ```typescript
 * constructor(private readonly tenantContext: TenantContext) {}
 * 
 * async someMethod() {
 *   const tenantId = this.tenantContext.tenantId; // Throws if no context
 *   // ... use tenantId for queue jobs, etc.
 * }
 * ```
 */
@Injectable()
export class TenantContext {
  /**
   * Get the current tenant ID from AsyncLocalStorage.
   * @throws Error if called outside of authenticated request context
   */
  get tenantId(): string {
    const store = tenantALS.getStore();
    if (!store?.tenantId) {
      throw new Error(
        'TenantContext: tenantId accessed outside of authenticated request context. ' +
        'Ensure this is called within a request handler after authentication.'
      );
    }
    return store.tenantId;
  }

  /**
   * Get the current user ID from AsyncLocalStorage.
   * @throws Error if called outside of authenticated request context
   */
  get userId(): string {
    const store = tenantALS.getStore();
    if (!store?.userId) {
      throw new Error(
        'TenantContext: userId accessed outside of authenticated request context. ' +
        'Ensure this is called within a request handler after authentication.'
      );
    }
    return store.userId;
  }

  /**
   * Get the current user's roles from AsyncLocalStorage.
   * @throws Error if called outside of authenticated request context
   */
  get roles(): string[] {
    const store = tenantALS.getStore();
    if (!store?.roles) {
      throw new Error(
        'TenantContext: roles accessed outside of authenticated request context. ' +
        'Ensure this is called within a request handler after authentication.'
      );
    }
    return store.roles;
  }

  /**
   * Check if tenant context is available (useful for conditional logic).
   * @returns true if context is available, false otherwise
   */
  get isAvailable(): boolean {
    const store = tenantALS.getStore();
    return !!(store?.tenantId);
  }

  /**
   * Get the full tenant store if available, or null if not in context.
   * Useful for optional tenant context scenarios.
   */
  getStoreOrNull() {
    return tenantALS.getStore() ?? null;
  }
}
