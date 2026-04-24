"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, lineLabor, fmt$ } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { assignLineItem } from "@/lib/actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  onUpdate: (invoices: Invoice[]) => void;
}

export function BoardScreen({ invoices, subs, onUpdate }: Props) {
  const [toast, showToast] = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overSub, setOverSub] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const unassigned = allLines.filter((l) => l.status === "unassigned");
  const bySub: Record<string, typeof allLines> = {};
  subs.forEach((s) => {
    bySub[s.id] = allLines.filter((l) => (l.sub?.id === s.id || l.subId === s.id) && l.status !== "unassigned" && l.status !== "paid");
  });

  const handleAssign = (lineId: string, subId: string) => {
    // Optimistic update
    const updatedInvoices = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) =>
        l.id === lineId ? { ...l, subId, sub: subs.find((s) => s.id === subId) || null, status: "assigned" as const } : l
      ),
    }));
    onUpdate(updatedInvoices);
    const sub = subs.find((s) => s.id === subId);
    showToast(`Assigned to ${sub?.name}`, "success");

    startTransition(async () => {
      await assignLineItem(lineId, subId);
    });
  };

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16, height: "100%", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="secondary" size="md" icon={<Icon.filter />}>All trades</Btn>
        <Btn variant="secondary" size="md">This week</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, flex: 1, minHeight: 0 }}>
        {/* Unassigned column */}
        <Card pad={0} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Unassigned</div>
              <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>
                {unassigned.length} items · {fmt$(unassigned.reduce((s, l) => s + l.invoice, 0))} value
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", background: "#fef4e6", color: "#8a5a1a", borderRadius: 999 }}>
              {unassigned.length}
            </span>
          </div>
          <Divider />
          <div style={{ padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {unassigned.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "#a8a49c" }}>All items assigned ✓</div>
            ) : unassigned.map((l) => (
              <div
                key={l.id}
                draggable
                onDragStart={() => setDraggingId(l.id)}
                onDragEnd={() => { setDraggingId(null); setOverSub(null); }}
                style={{
                  padding: 12, border: "1px solid #ecebe6", borderRadius: 10, background: "#fff",
                  cursor: "grab", opacity: draggingId === l.id ? 0.4 : 1,
                  boxShadow: draggingId === l.id ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
                  transition: "box-shadow 120ms, opacity 120ms",
                }}
              >
                <div style={{ fontSize: 10.5, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{l.invNum}</div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{l.desc}</div>
                <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{l.client}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(l.invoice)}</span>
                  <span style={{ fontSize: 11, color: "#8a8780" }}>Labor {fmt$(lineLabor(l))}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sub columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, overflowY: "auto", alignContent: "start" }}>
          {subs.map((sub) => {
            const lines = bySub[sub.id] || [];
            const weekTotal = lines.reduce((a, l) => a + lineLabor(l), 0);
            const isOver = overSub === sub.id;
            return (
              <div
                key={sub.id}
                onDragOver={(e) => { e.preventDefault(); setOverSub(sub.id); }}
                onDragLeave={() => setOverSub((s) => s === sub.id ? null : s)}
                onDrop={() => {
                  if (draggingId) handleAssign(draggingId, sub.id);
                  setDraggingId(null);
                  setOverSub(null);
                }}
                style={{
                  background: "#fff", borderRadius: 12,
                  border: isOver ? `1.5px solid ${sub.color}` : "1px solid #ecebe6",
                  boxShadow: isOver ? `0 0 0 4px ${sub.color}22` : "none",
                  display: "flex", flexDirection: "column", minHeight: 180,
                  transition: "box-shadow 120ms, border-color 120ms",
                }}
              >
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar sub={sub} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{sub.name}</div>
                    <div style={{ fontSize: 10.5, color: "#8a8780" }}>{sub.trade}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(weekTotal)}</div>
                    <div style={{ fontSize: 10, color: "#8a8780" }}>{lines.length} items</div>
                  </div>
                </div>
                <Divider />
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  {lines.length === 0 ? (
                    <div style={{ padding: 18, textAlign: "center", fontSize: 11, color: "#b8b5ae", border: "1px dashed #e4e1da", borderRadius: 8 }}>
                      Drop here to assign
                    </div>
                  ) : lines.map((l) => (
                    <div key={l.id} style={{ padding: "8px 10px", borderRadius: 7, background: "#fafaf8", border: "1px solid #f4f2ec" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: "#8a8780", fontWeight: 500 }}>{l.invNum}</span>
                        <StatusPill status={l.status} size="sm" />
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.35 }}>{l.desc}</div>
                      <div style={{ fontSize: 11, color: "#8a8780", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>Labor {fmt$(lineLabor(l))}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {toast}
    </div>
  );
}
