import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantStore = {
  tenantId: string;
  userId: string;
  roles: string[];
};

export const tenantALS = new AsyncLocalStorage<TenantStore>();
