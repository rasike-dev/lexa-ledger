import React from "react";
import { NavLink } from "react-router-dom";

export function GuidedDemoCTA({
  title,
  body,
  to,
  buttonLabel,
  subtle,
  step,
  totalSteps,
}: {
  title: string;
  body: string;
  to: string;
  buttonLabel: string;
  subtle?: boolean;
  step?: number;
  totalSteps?: number;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgb(var(--border))",
        background: subtle ? "rgb(var(--bg))" : "rgb(var(--card))",
      }}
    >
      {step && totalSteps && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "rgb(var(--muted))",
            marginBottom: 6,
          }}
        >
          Step {step} / {totalSteps}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>{body}</div>
        </div>

        <NavLink
          to={to}
          style={{
            textDecoration: "none",
            display: "inline-block",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--primary))",
            color: "white",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {buttonLabel} →
        </NavLink>
      </div>
    </div>
  );
}
