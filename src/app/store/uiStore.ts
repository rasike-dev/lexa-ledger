import { create } from "zustand";
import type { UserRole } from "../routes/nav";

export type ThemeMode = "light" | "dark";
export type DatasetMode = "demo";

type UIState = {
  activeLoanId: string | null;
  rightDrawerOpen: boolean;

  role: UserRole;
  theme: ThemeMode;
  language: "en" | "de";
  datasetMode: DatasetMode;

  lastExtractionAt: string | null;

  setActiveLoanId: (id: string | null) => void;
  setRightDrawerOpen: (open: boolean) => void;

  setRole: (role: UserRole) => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: "en" | "de") => void;

  setLastExtractionAt: (iso: string | null) => void;

  servicingScenarioByLoan: Record<string, "base" | "stress">;
  setServicingScenario: (loanId: string, scenario: "base" | "stress") => void;
  toggleServicingScenario: (loanId: string) => void;
  resetDemoState: (loanId: string) => void;

  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  activeLoanId: null,
  rightDrawerOpen: false,

  role: "agent",
  theme: "light",
  language: "en",
  datasetMode: "demo",

  lastExtractionAt: null,

  demoMode: false,

  setActiveLoanId: (id) => set(() => ({ activeLoanId: id, rightDrawerOpen: id ? true : false })),
  setRightDrawerOpen: (open) => set(() => ({ rightDrawerOpen: open })),

  setRole: (role) => set(() => ({ role })),
  setTheme: (theme) => set(() => ({ theme })),
  setLanguage: (language) => set(() => ({ language })),
  setLastExtractionAt: (lastExtractionAt) => set(() => ({ lastExtractionAt })),

  setDemoMode: (on) => set(() => ({ demoMode: on })),

  servicingScenarioByLoan: {},
  setServicingScenario: (loanId, scenario) =>
    set((s) => ({
      servicingScenarioByLoan: { ...s.servicingScenarioByLoan, [loanId]: scenario },
    })),

  toggleServicingScenario: (loanId) =>
    set((s) => {
      const current = s.servicingScenarioByLoan[loanId] ?? "base";
      const next = current === "base" ? "stress" : "base";
      return { servicingScenarioByLoan: { ...s.servicingScenarioByLoan, [loanId]: next } };
    }),

  resetDemoState: (loanId) =>
    set((s) => ({
      // reset servicing scenario
      servicingScenarioByLoan: { ...s.servicingScenarioByLoan, [loanId]: "base" },

      // close drawers/panels
      rightDrawerOpen: false,

      // turn off demo mode
      demoMode: false,

      // keep activeLoanId as-is; do not wipe navigation
    })),
}));
