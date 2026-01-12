import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI Role Simulation Store
 * 
 * Demo mode only - allows simulating different role sets in the UI
 * without changing the real JWT token.
 * 
 * Rules:
 * - Only active in DEMO_MODE (dev/demo environments)
 * - Affects UI gating only (hasAnyRole, route visibility)
 * - Never affects API authorization (backend uses real token)
 * - Must be visually obvious when active (badge in header)
 */

const DEMO_MODE =
  import.meta.env.MODE !== "production" || import.meta.env.VITE_DEMO_MODE === "true";

type UiRoleSimState = {
  enabled: boolean;
  simulatedRoles: string[];
  setSimulatedRoles: (roles: string[]) => void;
  clear: () => void;
  setEnabled: (v: boolean) => void;
};

export const useUiRoleSimStore = create<UiRoleSimState>()(
  persist(
    (set) => ({
      enabled: DEMO_MODE, // default ON in demo, ignored in prod usage below
      simulatedRoles: [],
      setSimulatedRoles: (roles) => set({ simulatedRoles: roles }),
      setEnabled: (v) => set({ enabled: v }),
      clear: () => set({ simulatedRoles: [] }),
    }),
    { name: "lexa-ui-role-sim" }
  )
);

/**
 * Helper: in production, this always returns false
 * Use this to gate UI role simulation features
 */
export function isUiRoleSimAllowed() {
  return DEMO_MODE;
}
