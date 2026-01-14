// featureFlags.ts - Feature flags

export const featureFlags = {
  /**
   * Guided Demo feature flag
   * 
   * When false, all guided demo UI components are hidden:
   * - "Start guided demo" buttons
   * - GuidedDemoCTA components
   * - Demo step indicators
   * - "Exit guided demo" buttons
   * 
   * Demo mode badge and role simulation remain visible.
   */
  GUIDED_DEMO: import.meta.env.VITE_GUIDED_DEMO === "true",
} as const;
