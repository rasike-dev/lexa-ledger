import { useAuthStore } from "../app/store/authStore";
import { isUiRoleSimAllowed, useUiRoleSimStore } from "./uiRoleSim.store";

/**
 * Get effective roles for UI gating
 * 
 * Returns:
 * - Real roles from JWT token (default)
 * - Simulated roles (if demo mode enabled and roles set)
 * 
 * IMPORTANT: This is for UI gating only.
 * Backend API calls always use the real JWT token.
 */
export function getEffectiveRoles(): string[] {
  const realRoles = useAuthStore.getState().roles || [];

  // In production, always use real roles
  if (!isUiRoleSimAllowed()) return realRoles;

  // In demo mode, check if simulation is active
  const { enabled, simulatedRoles } = useUiRoleSimStore.getState();
  if (!enabled || simulatedRoles.length === 0) return realRoles;

  // Return simulated roles for UI gating
  return simulatedRoles;
}
