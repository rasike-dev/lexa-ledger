import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RightDrawer } from "./RightDrawer";
import { StatusBar } from "./StatusBar";

export function AppShell() {
  return (
    <div
      className="app-shell"
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 360px",
        gridTemplateRows: "56px 1fr 28px",
        height: "100vh",
      }}
    >
      <div data-testid="app-sidebar" style={{ gridRow: "1 / span 3", gridColumn: "1" }}>
        <Sidebar />
      </div>

      <div data-testid="app-topbar" style={{ gridRow: "1", gridColumn: "2 / span 2" }}>
        <Topbar />
      </div>

      <main
        data-testid="page-content"
        style={{ gridRow: "2", gridColumn: "2", padding: 16, overflow: "auto" }}
      >
        <Outlet />
      </main>

      <div
        data-testid="app-rightdrawer"
        style={{ gridRow: "2", gridColumn: "3", borderLeft: "1px solid rgb(var(--border))" }}
      >
        <RightDrawer />
      </div>

      <div data-testid="app-statusbar" style={{ gridRow: "3", gridColumn: "2 / span 2" }}>
        <StatusBar />
      </div>
    </div>
  );
}
