import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../store/uiStore";
import { loanPaths } from "../routes/paths";
import { IdentityPanel } from "../components/IdentityPanel";
import { featureFlags } from "../config/featureFlags";

export function Topbar() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const role = useUIStore((s) => s.role);
  const setRole = useUIStore((s) => s.setRole);
  const demoMode = useUIStore((s) => s.demoMode);
  const resetDemoState = useUIStore((s) => s.resetDemoState);
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  const activeLoanId = useUIStore((s) => s.activeLoanId);

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
        {demoMode && featureFlags.GUIDED_DEMO && (
          <div
            className="demo-pulse"
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
            <span>Demo Mode</span>
            <span style={{ color: "rgb(var(--muted))", fontWeight: 900 }}>• Guided flow</span>

            <button
              onClick={() => {
                const id = activeLoanId ?? "demo-loan-001";
                resetDemoState(id);
                setDemoMode(false);
                navigate(`${loanPaths.overview(id)}#top`);
              }}
              style={{
                marginLeft: 6,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--bg))",
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                color: "rgb(var(--danger))",
              }}
              title="Exit guided demo"
            >
              Exit
            </button>
          </div>
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

        {/* Week 2.5: Identity Panel with user, tenant, roles, and logout */}
        <div style={{ marginLeft: 8, paddingLeft: 16, borderLeft: "1px solid rgb(var(--border))" }}>
          <IdentityPanel />
        </div>
      </div>
    </div>
  );
}
