import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navSections, type NavItem } from "../routes/nav";
import { useUIStore } from "../store/uiStore";
import { PORTFOLIO } from "../routes/paths";

function resolvePath(item: NavItem, loanId: string | null): string | null {
  if (typeof item.path === "string") return item.path;
  if (!loanId) return null;
  return item.path(loanId);
}

export function Sidebar() {
  const { t } = useTranslation("nav");
  const navigate = useNavigate();

  const role = useUIStore((s) => s.role);
  const activeLoanId = useUIStore((s) => s.activeLoanId);
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const setRightDrawerOpen = useUIStore((s) => s.setRightDrawerOpen);

  return (
    <div
      className="sidebar no-print"
      style={{
        height: "100%",
        borderRight: "1px solid rgb(var(--border))",
        background: "rgb(var(--card))",
        position: "relative",
      }}
    >
      <div style={{ padding: 16, fontWeight: 700 }}>
        LEXA Ledger
        <div style={{ fontSize: 12, color: "rgb(var(--muted))", fontWeight: 500 }}>
          The Operating System for Digital Loans
        </div>
      </div>

      {/* Context banner (only when a loan is selected) */}
      {activeLoanId && (
        <div
          style={{
            margin: "0 12px 12px 12px",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--bg))",
          }}
        >
          <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>{t("nav.activeLoan")}</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{activeLoanId}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => setRightDrawerOpen(true)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card))",
                fontSize: 12,
              }}
            >
              {t("nav.actions.openDrawer")}
            </button>

            <button
              onClick={() => {
                setActiveLoanId(null);
                setRightDrawerOpen(false);
                navigate(PORTFOLIO);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card))",
                fontSize: 12,
              }}
            >
              {t("nav.actions.clearLoan")}
            </button>
          </div>
        </div>
      )}

      <nav style={{ display: "flex", flexDirection: "column", gap: 12, padding: 8 }}>
        {navSections.map((section) => {
          if (section.requiresActiveLoan && !activeLoanId) return null;

          const visibleItems = section.items
            .filter((n) => n.rolesAllowed.includes(role))
            .map((item) => ({ item, path: resolvePath(item, activeLoanId) }))
            .filter((x) => !!x.path) as Array<{ item: NavItem; path: string }>;

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.key}>
              <div
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  color: "rgb(var(--muted))",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {t(section.labelKey)}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {visibleItems.map(({ item, path }) => (
                  <NavLink
                    key={item.key}
                    to={path}
                    style={({ isActive }) => ({
                      padding: "10px 12px",
                      borderRadius: 10,
                      textDecoration: "none",
                      color: "inherit",
                      background: isActive ? "rgba(37,99,235,0.12)" : "transparent",
                    })}
                  >
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          right: 16,
          fontSize: 12,
          color: "rgb(var(--muted))",
        }}
      >
        Demo Mode • v0.1
      </div>
    </div>
  );
}
