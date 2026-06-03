"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon, LogoMark } from "@/components/ui/Icons";

const SUPERVISOR_HIDDEN = new Set(["invoices", "payroll", "pricing", "expenses", "profitability", "users"]);

const items = [
  { id: "dashboard",      label: "Overview",        icon: Icon.dashboard,   path: "/dashboard" },
  { id: "invoices",       label: "Invoices",        icon: Icon.invoice,     path: "/invoices" },
  { id: "board",          label: "Assignments",     icon: Icon.board,       path: "/board" },
  { id: "approvals",      label: "Approvals",       icon: Icon.checkCircle, path: "/approvals" },
  { id: "quotes",         label: "Quotes",          icon: Icon.fileCheck,   path: "/quotes" },
  { id: "payroll",        label: "Payroll",         icon: Icon.payroll,     path: "/payroll" },
  { id: "subcontractors", label: "Subcontractors",  icon: Icon.user,        path: "/subcontractors" },
  { id: "pricing",        label: "Price List",      icon: Icon.tag,         path: "/pricing" },
  { id: "expenses",       label: "Expenses",        icon: Icon.receipt,     path: "/expenses" },
  { id: "profitability",  label: "Profitability",   icon: Icon.chart,       path: "/profitability" },
  { id: "users",          label: "Users",           icon: Icon.users,       path: "/users" },
];

interface SidebarProps {
  badges: { board: number; approvals: number };
  accent: string;
  role?: "admin" | "supervisor" | "subcontractor";
  onPreviewMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({ badges, accent, role = "admin", onPreviewMobile, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const badgeMap: Record<string, { count: number; color?: string }> = {
    board:     { count: badges.board },
    approvals: { count: badges.approvals, color: "#8a5a1a" },
  };

  const visibleItems = role === "supervisor"
    ? items.filter((it) => !SUPERVISOR_HIDDEN.has(it.id))
    : items;

  const isSupervisor = role === "supervisor";

  return (
    <div style={{
      width: 212, background: "#f4f2ec", borderRight: "1px solid #ecebe6",
      display: "flex", flexDirection: "column", padding: "16px 10px", flexShrink: 0, height: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px 18px" }}>
        <LogoMark accent={accent} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}>Bel Etage Systems</div>
          <div style={{ fontSize: 10.5, color: "#8a8780", marginTop: 1 }}>
            {isSupervisor ? "Supervisor · Snellville, GA" : "Admin · Snellville, GA"}
          </div>
        </div>
      </div>

      {isSupervisor && (
        <div style={{ margin: "0 0 10px", padding: "8px 10px", borderRadius: 8, background: "#f0ebf7", border: "1px solid #d8d0eb", display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7b5ea7", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#5c3d8a", fontWeight: 500 }}>Supervisor view — financials hidden</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {visibleItems.map((it) => {
          const active = pathname === it.path || (it.path === "/invoices" && pathname.startsWith("/invoices/"));
          const badge = badgeMap[it.id];
          return (
            <NavItem
              key={it.id}
              label={it.label}
              icon={<it.icon />}
              active={active}
              accent={accent}
              badge={badge?.count || null}
              badgeColor={badge?.color}
              onClick={() => router.push(it.path)}
            />
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {!isSupervisor && (
        <button onClick={onPreviewMobile} style={{
          display: "flex", alignItems: "center", gap: 10, padding: 10, cursor: "pointer",
          border: "1px dashed #dcd9d2", borderRadius: 8, background: "transparent", fontFamily: "inherit",
          color: "#6b6860", fontSize: 11.5, marginBottom: 8, textAlign: "left",
        }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#1a1814", color: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>◱</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "#4a4740" }}>Preview mobile</div>
            <div style={{ fontSize: 10.5 }}>See the sub&apos;s view</div>
          </div>
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 8, background: "#fff", border: "1px solid #ecebe6" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: isSupervisor ? "#5c3d8a" : "#1a1814", color: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600 }}>
          {isSupervisor ? "MS" : "JG"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600 }}>{isSupervisor ? "Marcus Stone" : "Jolene Galliano"}</div>
          <div style={{ fontSize: 10, color: "#8a8780" }}>{isSupervisor ? "Supervisor" : "Owner"}</div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "#8a8780" }}>
          <Icon.logout />
        </button>
      </div>
    </div>
  );
}

function NavItem({
  label, icon, active, accent, badge, badgeColor, onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  accent: string;
  badge: number | null;
  badgeColor?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
        borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit",
        background: active ? "#fff" : hovered ? "rgba(0,0,0,0.03)" : "transparent",
        color: active ? "#1a1814" : "#6b6860",
        fontSize: 12.5, fontWeight: active ? 600 : 500, textAlign: "left",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
        transition: "background 120ms, color 120ms",
        position: "relative",
      }}
    >
      <span style={{ color: active ? accent : "#9a968e" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? (
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
          background: badgeColor ? `${badgeColor}18` : "#ecebe6",
          color: badgeColor || "#6b6860",
          fontVariantNumeric: "tabular-nums",
        }}>{badge}</span>
      ) : null}
    </button>
  );
}
