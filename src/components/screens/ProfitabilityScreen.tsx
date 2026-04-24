"use client";

import { Invoice, invoiceTotals, fmt$ } from "@/lib/types";
import { Card, Divider } from "@/components/ui/Card";

function StatCard({ label, value, sub, accent = "#1a1814" }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: accent, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

export function ProfitabilityScreen({ invoices }: { invoices: Invoice[] }) {
  const rows = invoices.map((inv) => ({ inv, t: invoiceTotals(inv) }));
  const tot = rows.reduce((a, { t }) => ({
    invoice: a.invoice + t.invoice, labor: a.labor + t.labor,
    expenses: a.expenses + t.expenses, profit: a.profit + t.profit,
  }), { invoice: 0, labor: 0, expenses: 0, profit: 0 });
  const margin = tot.invoice ? tot.profit / tot.invoice : 0;

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard label="Revenue"  value={fmt$(tot.invoice)}  sub="All open invoices" />
        <StatCard label="Labor"    value={fmt$(tot.labor)}    sub={`${tot.invoice ? ((tot.labor / tot.invoice) * 100).toFixed(0) : 0}% of revenue`} accent="#6b6860" />
        <StatCard label="Expenses" value={fmt$(tot.expenses)} sub={`${tot.invoice ? ((tot.expenses / tot.invoice) * 100).toFixed(0) : 0}% of revenue`} accent="#8a5a1a" />
        <StatCard label="Profit"   value={fmt$(tot.profit)}   sub={`${(margin * 100).toFixed(1)}% margin`} accent="#2f6848" />
      </div>

      <Card pad={0}>
        <div style={{ padding: "14px 20px 10px", fontSize: 13, fontWeight: 600 }}>Per-invoice breakdown</div>
        <Divider />
        <div>
          {rows.map(({ inv, t }, i) => {
            const labPct = t.invoice ? (t.labor / t.invoice) * 100 : 0;
            const expPct = t.invoice ? (t.expenses / t.invoice) * 100 : 0;
            const profPct = t.invoice ? (t.profit / t.invoice) * 100 : 0;
            return (
              <div key={inv.id} style={{ padding: "14px 20px", borderBottom: i < rows.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.number}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{inv.client} · {inv.lines.length} lines</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmt$(t.invoice)}</div>
                  <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", color: "#6b6860" }}>−{fmt$(t.labor)}</div>
                  <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", color: "#6b6860" }}>−{fmt$(t.expenses)}</div>
                  <div style={{ textAlign: "right", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: t.profit > 0 ? "#2f6848" : "#a8442f" }}>{fmt$(t.profit)}</div>
                  <div style={{ fontSize: 11, color: "#6b6860", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(t.margin * 100).toFixed(1)}%</div>
                </div>
                <div style={{ marginTop: 10, display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: "#f4f2ec" }}>
                  <div style={{ width: `${labPct}%`, background: "#6b8cbf" }} />
                  <div style={{ width: `${expPct}%`, background: "#d89538" }} />
                  <div style={{ width: `${Math.max(0, profPct)}%`, background: "#4a8a6e" }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "#6b6860" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#6b8cbf" }}/>Labor</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#d89538" }}/>Expenses</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#4a8a6e" }}/>Profit</span>
      </div>
    </div>
  );
}
