/**
 * Service Identity Constants for Background Workers
 * 
 * Workers operate with a synthetic service account identity.
 * All audit events created by workers must use these constants
 * to clearly distinguish SERVICE actions from USER actions.
 */

/**
 * Client ID for the worker service account.
 * This matches the Keycloak client ID: lexa-ledger-worker
 */
export const SERVICE_CLIENT_ID = 'lexa-ledger-worker';

/**
 * Actor type for service-initiated actions.
 * Must be 'SERVICE' (not 'USER') for all worker audit events.
 */
export const SERVICE_ACTOR_TYPE = 'SERVICE' as const;
