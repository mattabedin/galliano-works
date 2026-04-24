"use client";

import { Icon } from "@/components/ui/Icons";
import { Btn } from "@/components/ui/Btn";

interface TopBarProps {
  title: string;
  sub: string;
  onCmdk: () => void;
  accent: string;
}

export function TopBar({ title, sub, onCmdk, accent }: TopBarProps) {
  const kbd: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 18, height: 18, padding: "0 5px", borderRadius: 4,
    background: "#ecebe6", color: "#6b6860", fontSize: 10.5,
    fontFamily: "JetBrains Mono, ui-monospace, monospace", fontWeight: 500,
  };

  return (
    <div style={{
      height: 58, borderBottom: "1px solid #ecebe6",
      display: "flex", alignItems: "center", padding: "0 28px", gap: 20,
      background: "rgba(250,248,244,0.85)", backdropFilter: "blur(8px)", flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 1 }}>{sub}</div>
      </div>

      <button onClick={onCmdk} style={{
        display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 12px",
        background: "#fff", border: "1px solid #ecebe6", borderRadius: 8, cursor: "pointer",
        fontSize: 12.5, color: "#8a8780", fontFamily: "inherit", minWidth: 280,
      }}>
        <Icon.search />
        <span style={{ flex: 1, textAlign: "left" }}>Search invoices, subs, jobs…</span>
        <span style={{ display: "flex", gap: 3 }}>
          <span style={kbd}>⌘</span><span style={kbd}>K</span>
        </span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Btn variant="ghost" size="sm"><Icon.plus /></Btn>
        <div style={{ width: 1, height: 20, background: "#ecebe6", margin: "0 4px" }} />
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: accent, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 600,
        }}>JG</div>
      </div>
    </div>
  );
}
