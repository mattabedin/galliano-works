"use client";

import { useState } from "react";
import { Invoice, Sub, PayHistory, lineLabor, fmt$ } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  payHistory: PayHistory[];
}

function StatCard({ label, value, sub, accent = "#1a1814" }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: accent, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

export function SubEarningsScreen({ invoices, subs, payHistory }: Props) {
  const [subId, setSubId] = useState(subs[0]?.id || "");
  const sub = subs.find((s) => s.id === subId);

  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const myLines = allLines.filter((l) => l.sub?.id === subId || l.subId === subId);
  const pending = myLines.filter((l) => l.status === "approved").reduce((s, l) => s + lineLabor(l), 0);
  const inProgress = myLines.filter((l) => ["assigned", "in_progress", "submitted"].includes(l.status)).reduce((s, l) => s + lineLabor(l), 0);
  const paidYTD = payHistory.filter((p) => p.subId === subId).reduce((s, p) => s + p.amount, 0);

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sub selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {subs.map((s) => (
          <button key={s.id} onClick={() => setSubId(s.id)} style={{
            padding: "8px 12px", borderRadius: 999, fontFamily: "inherit",
            border: subId === s.id ? `1.5px solid ${s.color}` : "1px solid #dcd9d2",
            background: subId === s.id ? "#fff" : "#fafaf8",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            fontSize: 12.5, fontWeight: 500,
            boxShadow: subId === s.id ? `0 0 0 3px ${s.color}22` : "none",
          }}>
            <Avatar sub={s} size={20} />
            {s.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatCard label="To be paid"  value={fmt$(pending)}    sub="Approved this week" accent="#2f6848" />
        <StatCard label="In progress" value={fmt$(inProgress)} sub="Work ongoing"        accent="#8a5a1a" />
        <StatCard label="Paid YTD"    value={fmt$(paidYTD)}    sub="2026" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        <Card pad={0}>
          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{sub?.name}&apos;s work</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>{myLines.length} line items assigned</div>
          </div>
          <Divider />
          {myLines.map((l, i) => (
            <div key={l.id} style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 100px", gap: 12, alignItems: "center", borderBottom: i < myLines.length - 1 ? "1px solid #f4f2ec" : "none" }}>
              <div>
                <div style={{ fontSize: 12.5 }}>{l.desc}</div>
                <div style={{ fontSize: 11, color: "#8a8780" }}>{l.invNum} · {l.client}</div>
              </div>
              <div style={{ fontSize: 12, color: "#6b6860", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt$(l.invoice)}</div>
              <div style={{ fontSize: 13, fontWeight: 500, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt$(lineLabor(l))}</div>
              <div style={{ textAlign: "right" }}><StatusPill status={l.status} size="sm" /></div>
            </div>
          ))}
        </Card>

        <Card pad={0}>
          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Payment history</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>Weekly PDF summaries</div>
          </div>
          <Divider />
          {payHistory.filter((p) => p.subId === subId).map((p, i, arr) => (
            <div key={p.id} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: "#e8f1ec", color: "#2f6848", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon.pdf />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.week}</div>
                <div style={{ fontSize: 11, color: "#8a8780" }}>{p.items} items · Paid</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt$(p.amount)}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
