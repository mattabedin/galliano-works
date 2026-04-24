"use client";

import { Invoice, Sub, lineLabor, lineProfit, invoiceTotals, fmt$ } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  accent: string;
  goto: (page: string) => void;
}

export function DashboardScreen({ invoices, subs, accent, goto }: Props) {
  const allLines = invoices.flatMap((i) => i.lines);
  const byStatus = (s: string) => allLines.filter((l) => l.status === s).length;

  const openWork = allLines.filter((l) => ["assigned", "in_progress", "submitted"].includes(l.status)).length;
  const awaitingApproval = byStatus("submitted");
  const unassigned = byStatus("unassigned");

  const weekApproved = allLines.filter((l) => l.status === "approved");
  const weekPayroll = weekApproved.reduce((s, l) => s + lineLabor(l), 0);

  const totals = invoices.reduce((acc, inv) => {
    const t = invoiceTotals(inv);
    return { invoice: acc.invoice + t.invoice, labor: acc.labor + t.labor, expenses: acc.expenses + t.expenses };
  }, { invoice: 0, labor: 0, expenses: 0 });
  const profit = totals.invoice - totals.labor - totals.expenses;
  const margin = totals.invoice ? profit / totals.invoice : 0;

  const subStats = subs.map((s) => {
    const lines = allLines.filter((l) => l.sub?.id === s.id || l.subId === s.id);
    const pending = lines.filter((l) => ["assigned", "in_progress"].includes(l.status)).length;
    const toBePaid = lines.filter((l) => l.status === "approved").reduce((a, l) => a + lineLabor(l), 0);
    return { ...s, pending, toBePaid, total: lines.length };
  }).sort((a, b) => b.toBePaid - a.toBePaid);

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Hero stat */}
      <div style={{
        background: "linear-gradient(135deg, #1f1c18 0%, #2b2520 100%)",
        color: "#faf8f4", borderRadius: 16, padding: "26px 28px",
        display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, position: "relative", overflow: "hidden",
      }}>
        <div>
          <div style={{ fontSize: 10.5, opacity: 0.55, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>Payroll this week</div>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 64, fontWeight: 400, letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {fmt$(weekPayroll)}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10, display: "flex", gap: 16 }}>
            <span><b style={{ color: "#faf8f4" }}>{weekApproved.length}</b> approved items</span>
            <span><b style={{ color: "#faf8f4" }}>{awaitingApproval}</b> pending review</span>
            <span style={{ opacity: 0.6 }}>Pays out Fri, Apr 25</span>
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
            <Btn variant="primary" size="md" icon={<Icon.payroll />} onClick={() => goto("payroll")} style={{ background: accent, borderColor: accent }}>
              Review & run payroll
            </Btn>
            <Btn variant="ghost" size="md" icon={<Icon.upload />} onClick={() => goto("invoices")} style={{ color: "#faf8f4", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              Import invoices
            </Btn>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          <div style={{ fontSize: 10.5, opacity: 0.55, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {subStats.filter((s) => s.toBePaid > 0).slice(0, 5).map((s) => {
              const pct = weekPayroll ? (s.toBePaid / weekPayroll) * 100 : 0;
              return (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 10, alignItems: "center", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.85 }}>
                    <Avatar sub={s} size={18} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name.split(" ")[0]}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: 999 }} />
                  </div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>{fmt$(s.toBePaid)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <StatCard label="Open work items"     value={String(openWork)}        sub={`${unassigned} to assign`} onClick={() => goto("board")} />
        <StatCard label="Awaiting approval"   value={String(awaitingApproval)} sub="Needs review" accent="#8a5a1a" onClick={() => goto("approvals")} />
        <StatCard label="Profit this period"  value={fmt$(profit)}             sub={`${(margin * 100).toFixed(1)}% margin`} accent="#2f6848" onClick={() => goto("profit")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        {/* Activity list */}
        <Card pad={0}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Recent activity</div>
            <button onClick={() => goto("approvals")} style={{ fontSize: 12, color: "#6b6860", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              View all <Icon.chevronR />
            </button>
          </div>
          <Divider />
          <div>
            {allLines.filter((l) => ["submitted", "in_progress", "approved"].includes(l.status)).slice(0, 6).map((l, i, arr) => {
              const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
              const inv = invoices.find((x) => x.lines.some((ll) => ll.id === l.id));
              return (
                <div key={l.id} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  <Avatar sub={sub} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#1a1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <b style={{ fontWeight: 500 }}>{sub?.name}</b> · {l.desc}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>
                      {inv?.number} · {inv?.client}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{fmt$(lineLabor(l))}</div>
                  <StatusPill status={l.status} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sub rankings */}
        <Card pad={0}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Subcontractor earnings</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>Ready to be paid out this week</div>
          </div>
          <Divider />
          {subStats.slice(0, 6).map((s, i, arr) => (
            <div key={s.id} style={{ padding: "11px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
              <Avatar sub={s} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#8a8780" }}>{s.trade} · {s.pending} in progress</div>
              </div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{fmt$(s.toBePaid)}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = "#1a1814", onClick }: { label: string; value: string; sub: string; accent?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, padding: 18,
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 150ms, border-color 150ms",
    }}
    onMouseEnter={(e) => { if (onClick) { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.borderColor = "#dcd9d2"; } }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = "#ecebe6"; }}>
      <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: accent, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
