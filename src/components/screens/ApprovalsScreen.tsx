"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, LineItem, lineLabor, fmt$ } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { approveLineItem, rejectLineItem, approveAllSubmitted } from "@/lib/actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  onUpdate: (invoices: Invoice[]) => void;
}

export function ApprovalsScreen({ invoices, subs, onUpdate }: Props) {
  const [toast, showToast] = useToast();
  const [, startTransition] = useTransition();

  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const submitted = allLines.filter((l) => l.status === "submitted");
  const inProgress = allLines.filter((l) => l.status === "in_progress");
  const recentlyApproved = allLines.filter((l) => l.status === "approved").slice(0, 5);

  const updateStatus = (lineId: string, status: string) => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) => l.id === lineId ? { ...l, status: status as LineItem["status"] } : l),
    }));
    onUpdate(updated);
  };

  const approve = (l: typeof allLines[0]) => {
    updateStatus(l.id, "approved");
    showToast(`Approved · ${l.desc.slice(0, 30)}…`, "success");
    startTransition(async () => { await approveLineItem(l.id); });
  };

  const reject = (l: typeof allLines[0]) => {
    updateStatus(l.id, "in_progress");
    showToast("Sent back to subcontractor");
    startTransition(async () => { await rejectLineItem(l.id); });
  };

  const approveAll = () => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) => l.status === "submitted" ? { ...l, status: "approved" as const } : l),
    }));
    onUpdate(updated);
    showToast(`Approved all ${submitted.length} items`, "success");
    startTransition(async () => { await approveAllSubmitted(); });
  };

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Pending */}
          <Card pad={0}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Pending your approval</div>
                <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>
                  {submitted.length} items · {fmt$(submitted.reduce((s, l) => s + lineLabor(l), 0))} in labor
                </div>
              </div>
              {submitted.length > 0 && (
                <Btn variant="success" size="sm" icon={<Icon.check />} onClick={approveAll}>Approve all</Btn>
              )}
            </div>
            <Divider />
            {submitted.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13 }}>
                Nothing pending — you&apos;re all caught up
              </div>
            ) : submitted.map((l, i, arr) => {
              const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
              return (
                <div key={l.id} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Avatar sub={sub} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{sub?.name}</span>
                        <span style={{ fontSize: 10.5, color: "#8a8780", background: "#f4f2ec", padding: "1px 6px", borderRadius: 4 }}>{l.invNum}</span>
                        <span style={{ fontSize: 11, color: "#8a8780" }}>· {l.client}</span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>{l.desc}</div>
                      {l.note && (
                        <div style={{ marginTop: 8, padding: "8px 10px", background: "#fafaf8", borderLeft: "2px solid #dcd9d2", borderRadius: "0 6px 6px 0", fontSize: 12, color: "#4a4740", fontStyle: "italic" }}>
                          &quot;{l.note}&quot;
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(lineLabor(l))}</div>
                      <div style={{ fontSize: 11, color: "#8a8780", marginTop: 1 }}>labor</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, paddingLeft: 46 }}>
                    <Btn variant="success" size="sm" icon={<Icon.check />} onClick={() => approve(l)}>Approve</Btn>
                    <Btn variant="secondary" size="sm" onClick={() => reject(l)}>Send back</Btn>
                    <Btn variant="ghost" size="sm">View details</Btn>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* In progress */}
          <Card pad={0}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>In progress</div>
              <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>{inProgress.length} items being worked on</div>
            </div>
            <Divider />
            {inProgress.map((l, i, arr) => {
              const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
              return (
                <div key={l.id} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  <Avatar sub={sub} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{l.desc}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{sub?.name} · {l.invNum}</div>
                  </div>
                  <StatusPill status={l.status} size="sm" />
                </div>
              );
            })}
          </Card>
        </div>

        {/* Recently approved */}
        <Card pad={0}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Recently approved</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>Ready for this week&apos;s payroll</div>
          </div>
          <Divider />
          {recentlyApproved.map((l, i, arr) => {
            const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
            return (
              <div key={l.id} style={{ padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar sub={sub} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.desc}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{sub?.name}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt$(lineLabor(l))}</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
      {toast}
    </div>
  );
}
