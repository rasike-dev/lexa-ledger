import React from "react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../store/uiStore";

export function Topbar() {
  const { t } = useTranslation("common");
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const role = useUIStore((s) => s.role);
  const setRole = useUIStore((s) => s.setRole);
  const demoMode = useUIStore((s) => s.demoMode);

  return (
    <div
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        borderBottom: "1px solid rgb(var(--border))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "60%" }}>
        <input
          placeholder={t("searchPlaceholder")}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--bg))",
            color: "rgb(var(--fg))",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {demoMode && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgb(var(--border))",
              background: "rgba(37,99,235,0.10)",
              color: "rgb(37,99,235)",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            Demo Mode
            <span style={{ color: "rgb(var(--muted))", fontWeight: 900 }}>• Guided flow</span>
          </span>
        )}

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          style={{ padding: "8px 10px", borderRadius: 10 }}
        >
          <option value="agent">{t("role.agent")}</option>
          <option value="lender">{t("role.lender")}</option>
          <option value="borrower">{t("role.borrower")}</option>
          <option value="buyer">{t("role.buyer")}</option>
        </select>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          style={{ padding: "8px 10px", borderRadius: 10 }}
        >
          <option value="en">EN</option>
          <option value="de">DE</option>
        </select>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          {theme === "dark" ? t("theme.light") : t("theme.dark")}
        </button>
      </div>
    </div>
  );
}
