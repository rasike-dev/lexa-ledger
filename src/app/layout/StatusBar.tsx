import React from "react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../store/uiStore";

export function StatusBar() {
  const { t } = useTranslation("common");
  const dataset = useUIStore((s) => s.datasetMode);
  const lastExtractionAt = useUIStore((s) => s.lastExtractionAt);

  return (
    <div
      style={{
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderTop: "1px solid rgb(var(--border))",
        color: "rgb(var(--muted))",
        fontSize: 12,
      }}
    >
      <div>
        {t("status.environment")}: Production
      </div>
      <div>
        {t("status.lastExtraction")}:{" "}
        {lastExtractionAt ? new Date(lastExtractionAt).toLocaleString() : t("status.never")}
      </div>
    </div>
  );
}
