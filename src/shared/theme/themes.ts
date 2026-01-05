// themes.ts - Theme registry

export const themes = {
  light: "light",
  dark: "dark",
} as const;

export type Theme = (typeof themes)[keyof typeof themes];
