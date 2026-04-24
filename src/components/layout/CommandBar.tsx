"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icons";

interface CommandBarProps {
  onClose: () => void;
  setPage: (page: string) => void;
}

export function CommandBar({ onClose, setPage }: CommandBarProps) {
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allItems = [
    { group: "Go to", entries: [
      { label: "Overview",      action: () => setPage("dashboard"), icon: <Icon.dashboard /> },
      { label: "Assignments",   action: () => setPage("board"),     icon: <Icon.board /> },
      { label: "Approvals",     action: () => setPage("approvals"), icon: <Icon.checkCircle /> },
      { label: "Payroll",       action: () => setPage("payroll"),   icon: <Icon.payroll /> },
      { label: "Profitability", action: () => setPage("profit"),    icon: <Icon.chart /> },
    ]},
    { group: "Actions", entries: [
      { label: "Import invoices from FreshBooks", action: () => setPage("invoices"), icon: <Icon.upload /> },
      { label: "Run this week's payroll",         action: () => setPage("payroll"),  icon: <Icon.payroll /> },
      { label: "Log an expense",                  action: () => setPage("expenses"), icon: <Icon.receipt /> },
    ]},
  ];

  const filtered = allItems
    .map((g) => ({ ...g, entries: g.entries.filter((e) => e.label.toLowerCase().includes(q.toLowerCase())) }))
    .filter((g) => g.entries.length);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(26,24,20,0.4)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120, zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 520, background: "#fff", borderRadius: 14,
        boxShadow: "0 24px 80px rgba(0,0,0,0.24)", overflow: "hidden",
        animation: "cmdk-in 160ms ease-out",
      }}>
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #ecebe6" }}>
          <Icon.search style={{ color: "#8a8780" }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or search…"
            style={{ flex: 1, border: "none", fontSize: 15, fontFamily: "inherit", outline: "none", color: "#1a1814", background: "transparent" }}
          />
          <span style={{ fontSize: 10, color: "#8a8780", padding: "2px 6px", border: "1px solid #ecebe6", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }}>ESC</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", padding: 6 }}>
          {filtered.map((g) => (
            <div key={g.group}>
              <div style={{ fontSize: 10, color: "#8a8780", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 12px 4px" }}>
                {g.group}
              </div>
              {g.entries.map((e) => (
                <CmdItem key={e.label} icon={e.icon} label={e.label} onClick={() => { e.action(); onClose(); }} />
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "#a8a49c", fontSize: 13 }}>No results</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CmdItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", padding: "9px 12px", display: "flex", alignItems: "center", gap: 10,
        background: hovered ? "#faf8f4" : "transparent", border: "none", borderRadius: 7,
        cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#1a1814", textAlign: "left",
        transition: "background 80ms",
      }}
    >
      <span style={{ color: "#8a8780" }}>{icon}</span>
      {label}
    </button>
  );
}
