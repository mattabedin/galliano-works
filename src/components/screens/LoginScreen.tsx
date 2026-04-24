"use client";

import { useState } from "react";
import { LogoMark } from "@/components/ui/Icons";

interface Props {
  accent: string;
  onLogin: (role: "admin" | "subcontractor") => void;
}

export function LoginScreen({ accent, onLogin }: Props) {
  const [email, setEmail] = useState("admin@galliano.co");
  const [password, setPassword] = useState("••••••••");
  const [role, setRole] = useState<"admin" | "subcontractor">("admin");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin(role);
      setLoading(false);
    }, 450);
  };

  const input: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 14px",
    border: "1px solid #dcd9d2", borderRadius: 8,
    background: "#fff", fontSize: 14, fontFamily: "inherit",
    color: "#1a1814", outline: "none",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fafaf8" }}>
      {/* Left: form */}
      <div style={{ display: "flex", flexDirection: "column", padding: "48px 56px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark accent={accent} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.01em" }}>Galliano Works</span>
        </div>

        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.15 }}>
            Sign in to your workspace
          </h1>
          <p style={{ color: "#6b6860", fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>
            Order tracking & payroll for Galliano Enterprises.
          </p>

          <form onSubmit={submit} style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
            </div>

            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 6 }}>Demo: sign in as</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["admin", "subcontractor"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: role === r ? `1.5px solid ${accent}` : "1px solid #dcd9d2",
                    background: role === r ? "#fff" : "#fafaf8",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                    color: role === r ? "#1a1814" : "#6b6860",
                    textAlign: "left",
                    boxShadow: role === r ? `0 0 0 3px ${accent}22` : "none",
                  }}>
                    <div>{r === "admin" ? "Admin" : "Subcontractor"}</div>
                    <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 400, marginTop: 2 }}>
                      {r === "admin" ? "Full access — assign, approve, pay" : "My jobs on mobile"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 14, height: 42, borderRadius: 8, border: "none",
              background: loading ? "#8a5a4a" : accent, color: "#fff",
              fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
              <a href="#" style={{ color: "#6b6860", textDecoration: "none" }}>Forgot password?</a>
              <a href="#" style={{ color: "#6b6860", textDecoration: "none" }}>Need an account?</a>
            </div>
          </form>
        </div>

        <div style={{ fontSize: 11, color: "#9a968e" }}>
          © 2026 Galliano Enterprises, Ltd. Co.
        </div>
      </div>

      {/* Right: decorative panel */}
      <div style={{
        background: `linear-gradient(165deg, #1f1c18 0%, #2b2520 60%, ${accent}22 100%)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: 48, color: "#e8e4dc", position: "relative", overflow: "hidden",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>
          Week of Apr 20 — Apr 26
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MiniStat label="Open work items"   value="34" trend="+6" />
            <MiniStat label="Awaiting approval" value="7"  trend="+2" />
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, backdropFilter: "blur(8px)" }}>
            <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>This week&apos;s payroll</div>
            <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>$12,480</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>across 6 subcontractors · 23 completed line items</div>
            <div style={{ marginTop: 14, display: "flex", gap: 4 }}>
              {[0.8, 0.55, 0.9, 0.4, 0.72, 0.3].map((v, i) => (
                <div key={i} style={{ flex: 1, height: 34, borderRadius: 3, background: `linear-gradient(180deg, ${accent}dd, ${accent}66)`, opacity: 0.4 + v * 0.6, transform: `scaleY(${v})`, transformOrigin: "bottom" }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.6, maxWidth: 280 }}>
          Centralized work orders, subcontractor assignments, and weekly payroll — in one place.
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 10.5, opacity: 0.55, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontSize: 11, color: "#7fd19f" }}>{trend}</span>
      </div>
    </div>
  );
}
