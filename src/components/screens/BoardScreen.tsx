"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, lineLabor, fmt$ } from "@/lib/types";
import { InvoiceRecordData, WorkLineData, WORK_STATUS_META } from "@/lib/invoice-types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { assignLineItem } from "@/lib/actions";
import { assignWorkLine } from "@/lib/invoice-actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  onUpdate: (invoices: Invoice[]) => void;
  invoiceRecords?: InvoiceRecordData[];
  onRefresh?: () => void;
}

type DragKind = "legacy" | "workline";

export function BoardScreen({ invoices, subs, onUpdate, invoiceRecords = [], onRefresh }: Props) {
  const [toast, showToast] = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingKind, setDraggingKind] = useState<DragKind>("legacy");
  const [overSub, setOverSub] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Legacy LineItems
  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const unassignedLegacy = allLines.filter((l) => l.status === "unassigned");
  const bySub: Record<string, typeof allLines> = {};
  subs.forEach((s) => {
    bySub[s.id] = allLines.filter((l) => (l.sub?.id === s.id || l.subId === s.id) && l.status !== "unassigned" && l.status !== "paid");
  });

  // WorkLines from new invoice module
  const allWorkLines: (WorkLineData & { invoiceNumber: string })[] = invoiceRecords.flatMap((rec) =>
    rec.lineItems.flatMap((li) =>
      li.workLines.map((wl) => ({ ...wl, invoiceNumber: rec.invoiceNumber }))
    )
  );
  const unassignedWorkLines = allWorkLines.filter((wl) => wl.workStatus === "unassigned");
  const workLinesBySub: Record<string, typeof allWorkLines> = {};
  subs.forEach((s) => {
    workLinesBySub[s.id] = allWorkLines.filter(
      (wl) => wl.assignedSubId === s.id && wl.workStatus !== "unassigned" && wl.workStatus !== "paid"
    );
  });

  const handleAssignLegacy = (lineId: string, subId: string) => {
    const updatedInvoices = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) =>
        l.id === lineId ? { ...l, subId, sub: subs.find((s) => s.id === subId) || null, status: "assigned" as const } : l
      ),
    }));
    onUpdate(updatedInvoices);
    const sub = subs.find((s) => s.id === subId);
    showToast(`Assigned to ${sub?.name}`, "success");
    startTransition(async () => { await assignLineItem(lineId, subId); });
  };

  const handleAssignWorkLine = (workLineId: string, subId: string) => {
    const sub = subs.find((s) => s.id === subId);
    showToast(`Assigned to ${sub?.name}`, "success");
    startTransition(async () => {
      await assignWorkLine(workLineId, subId);
      onRefresh?.();
    });
  };

  const handleDrop = (subId: string) => {
    if (!draggingId) return;
    if (draggingKind === "legacy") handleAssignLegacy(draggingId, subId);
    else handleAssignWorkLine(draggingId, subId);
    setDraggingId(null);
    setOverSub(null);
  };

  const totalUnassigned = unassignedLegacy.length + unassignedWorkLines.length;
  const totalUnassignedValue =
    unassignedLegacy.reduce((s, l) => s + l.invoice, 0) +
    unassignedWorkLines.reduce((s, wl) => s + wl.invoiceLineAmount, 0);

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
                {totalUnassigned} items · {fmt$(totalUnassignedValue)} value
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", background: "#fef4e6", color: "#8a5a1a", borderRadius: 999 }}>
              {totalUnassigned}
            </span>
          </div>
          <Divider />
          <div style={{ padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {totalUnassigned === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "#a8a49c" }}>All items assigned ✓</div>
            ) : (
              <>
                {unassignedLegacy.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={() => { setDraggingId(l.id); setDraggingKind("legacy"); }}
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
                {unassignedWorkLines.map((wl) => (
                  <div
                    key={wl.id}
                    draggable
                    onDragStart={() => { setDraggingId(wl.id); setDraggingKind("workline"); }}
                    onDragEnd={() => { setDraggingId(null); setOverSub(null); }}
                    style={{
                      padding: 12, border: "1px solid #e6f0f2", borderRadius: 10, background: "#fff",
                      cursor: "grab", opacity: draggingId === wl.id ? 0.4 : 1,
                      boxShadow: draggingId === wl.id ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
                      transition: "box-shadow 120ms, opacity 120ms",
                    }}
                  >
                    <div style={{ fontSize: 10.5, color: "#5a7a80", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{wl.invoiceNumber}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{wl.title}</div>
                    <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{wl.customerName}</div>
                    {wl.serviceAddress && (
                      <div style={{ fontSize: 11, color: "#a8a49c", marginTop: 2 }}>📍 {wl.serviceAddress}</div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(wl.invoiceLineAmount)}</span>
                      <span style={{ fontSize: 10, color: "#6b9ea6", background: "#e6f0f2", padding: "1px 6px", borderRadius: 4 }}>Work line</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

        {/* Sub columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, overflowY: "auto", alignContent: "start" }}>
          {subs.map((sub) => {
            const legacyLines = bySub[sub.id] || [];
            const subWorkLines = workLinesBySub[sub.id] || [];
            const weekTotal =
              legacyLines.reduce((a, l) => a + lineLabor(l), 0) +
              subWorkLines.reduce((a, wl) => a + (wl.payAmount ?? wl.invoiceLineAmount), 0);
            const isOver = overSub === sub.id;
            const itemCount = legacyLines.length + subWorkLines.length;
            return (
              <div
                key={sub.id}
                onDragOver={(e) => { e.preventDefault(); setOverSub(sub.id); }}
                onDragLeave={() => setOverSub((s) => s === sub.id ? null : s)}
                onDrop={() => handleDrop(sub.id)}
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
                    <div style={{ fontSize: 10, color: "#8a8780" }}>{itemCount} items</div>
                  </div>
                </div>
                <Divider />
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  {itemCount === 0 ? (
                    <div style={{ padding: 18, textAlign: "center", fontSize: 11, color: "#b8b5ae", border: "1px dashed #e4e1da", borderRadius: 8 }}>
                      Drop here to assign
                    </div>
                  ) : (
                    <>
                      {legacyLines.map((l) => (
                        <div key={l.id} style={{ padding: "8px 10px", borderRadius: 7, background: "#fafaf8", border: "1px solid #f4f2ec" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: "#8a8780", fontWeight: 500 }}>{l.invNum}</span>
                            <StatusPill status={l.status} size="sm" />
                          </div>
                          <div style={{ fontSize: 12, lineHeight: 1.35 }}>{l.desc}</div>
                          <div style={{ fontSize: 11, color: "#8a8780", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>Labor {fmt$(lineLabor(l))}</div>
                        </div>
                      ))}
                      {subWorkLines.map((wl) => {
                        const meta = WORK_STATUS_META[wl.workStatus];
                        return (
                          <div key={wl.id} style={{ padding: "8px 10px", borderRadius: 7, background: "#f5fafb", border: "1px solid #e0eef0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 10, color: "#5a7a80", fontWeight: 500 }}>{wl.invoiceNumber}</span>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 7px", borderRadius: 999,
                                background: meta.bg, color: meta.fg,
                                fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap",
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
                                {meta.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, lineHeight: 1.35 }}>{wl.title}</div>
                            <div style={{ fontSize: 11, color: "#8a8780", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                              {fmt$(wl.payAmount ?? wl.invoiceLineAmount)}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
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
