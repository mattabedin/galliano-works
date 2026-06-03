"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, LineItem, lineLabor, fmt$ } from "@/lib/types";
import { InvoiceRecordData, WorkLineData } from "@/lib/invoice-types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { approveLineItem, rejectLineItem, approveAllSubmitted } from "@/lib/actions";
import { updateWorkLineStatus, sendBackWorkLine } from "@/lib/invoice-actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  onUpdate: (invoices: Invoice[]) => void;
  invoiceRecords?: InvoiceRecordData[];
  onRefresh?: () => void;
}

export function ApprovalsScreen({ invoices, subs, onUpdate, invoiceRecords = [], onRefresh }: Props) {
  const [toast, showToast] = useToast();
  const [, startTransition] = useTransition();
  const [sendBackId, setSendBackId] = useState<string | null>(null);
  const [sendBackNote, setSendBackNote] = useState("");
  const [viewInvId, setViewInvId] = useState<string | null>(null);

  // Legacy LineItems
  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const submitted = allLines.filter((l) => l.status === "submitted");
  const inProgress = allLines.filter((l) => l.status === "in_progress");
  const recentlyApproved = allLines.filter((l) => l.status === "approved").slice(0, 5);

  // WorkLines from new invoice module
  const allWorkLines: (WorkLineData & { invoiceNumber: string })[] = invoiceRecords.flatMap((rec) =>
    rec.lineItems.flatMap((li) =>
      li.workLines.map((wl) => ({ ...wl, invoiceNumber: rec.invoiceNumber }))
    )
  );
  const submittedWorkLines = allWorkLines.filter((wl) => wl.workStatus === "submitted");
  const inProgressWorkLines = allWorkLines.filter((wl) => wl.workStatus === "in_progress" || wl.workStatus === "assigned");
  const recentlyApprovedWorkLines = allWorkLines.filter((wl) => wl.workStatus === "approved").slice(0, 5);

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

  const reject = (l: typeof allLines[0], note?: string) => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((line) =>
        line.id === l.id ? { ...line, status: "in_progress" as const, note: note || line.note } : line
      ),
    }));
    onUpdate(updated);
    showToast("Sent back to subcontractor");
    startTransition(async () => { await rejectLineItem(l.id, note); });
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

  const approveWorkLine = (wl: WorkLineData) => {
    showToast(`Approved · ${wl.title.slice(0, 30)}…`, "success");
    startTransition(async () => {
      await updateWorkLineStatus(wl.id, "approved");
      onRefresh?.();
    });
  };

  const rejectWorkLine = (wl: WorkLineData, note?: string) => {
    showToast("Sent back to subcontractor");
    startTransition(async () => {
      await sendBackWorkLine(wl.id, note || "");
      onRefresh?.();
    });
  };

  const approveAllWorkLines = () => {
    showToast(`Approved ${submittedWorkLines.length} work line${submittedWorkLines.length !== 1 ? "s" : ""}`, "success");
    startTransition(async () => {
      await Promise.all(submittedWorkLines.map((wl) => updateWorkLineStatus(wl.id, "approved")));
      onRefresh?.();
    });
  };

  const totalSubmitted = submitted.length + submittedWorkLines.length;
  const totalSubmittedValue =
    submitted.reduce((s, l) => s + lineLabor(l), 0) +
    submittedWorkLines.reduce((s, wl) => s + (wl.payAmount ?? wl.invoiceLineAmount), 0);

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
                  {totalSubmitted} items · {fmt$(totalSubmittedValue)} in labor
                </div>
              </div>
              {totalSubmitted > 0 && (
                <Btn variant="success" size="sm" icon={<Icon.check />} onClick={() => { approveAll(); approveAllWorkLines(); }}>
                  Approve all
                </Btn>
              )}
            </div>
            <Divider />
            {totalSubmitted === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13 }}>
                Nothing pending — you&apos;re all caught up
              </div>
            ) : (
              <>
                {submitted.map((l, i, arr) => {
                  const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
                  return (
                    <div key={l.id} style={{ padding: "14px 20px", borderBottom: (i < arr.length - 1 || submittedWorkLines.length > 0) ? "1px solid #f4f2ec" : "none" }}>
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
                      <div style={{ display: "flex", gap: 8, marginTop: 10, paddingLeft: 46, flexWrap: "wrap" }}>
                        <Btn variant="success" size="sm" icon={<Icon.check />} onClick={() => approve(l)}>Approve</Btn>
                        <Btn variant="secondary" size="sm" onClick={() => {
                          setSendBackId(sendBackId === l.id ? null : l.id);
                          setSendBackNote("");
                        }}>Send back</Btn>
                        <Btn variant="ghost" size="sm" icon={<Icon.invoice />} onClick={() => setViewInvId(viewInvId === l.id ? null : l.id)}>
                          {viewInvId === l.id ? "Hide invoice" : "View invoice"}
                        </Btn>
                      </div>
                      {viewInvId === l.id && (() => {
                        const inv = invoices.find((x) => x.number === l.invNum);
                        if (!inv) return null;
                        return (
                          <div style={{ marginTop: 10, paddingLeft: 46 }}>
                            <div style={{ background: "#fafaf8", border: "1px solid #ecebe6", borderRadius: 10, overflow: "hidden" }}>
                              <div style={{ padding: "12px 16px", borderBottom: "1px solid #ecebe6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600 }}>{inv.number} · {inv.client}</div>
                                  <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>{inv.address}</div>
                                </div>
                                <div style={{ fontSize: 12, color: "#8a8780" }}>{inv.lines.length} line items</div>
                              </div>
                              {inv.lines.map((line, li) => {
                                const lineSub = line.sub || subs.find((s) => s.id === line.subId);
                                return (
                                  <div key={line.id} style={{ padding: "10px 16px", borderBottom: li < inv.lines.length - 1 ? "1px solid #f4f2ec" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12.5, color: line.id === l.id ? "#1a1814" : "#6b6860", fontWeight: line.id === l.id ? 600 : 400 }}>{line.desc}</div>
                                      <div style={{ fontSize: 11, color: "#8a8780", marginTop: 1 }}>{lineSub?.name || "Unassigned"}</div>
                                    </div>
                                    <div style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: "tabular-nums", minWidth: 60, textAlign: "right" }}>
                                      {fmt$(line.invoice)}
                                    </div>
                                    <StatusPill status={line.status} size="sm" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {sendBackId === l.id && (
                        <div style={{ marginTop: 10, paddingLeft: 46 }}>
                          <div style={{ background: "#fef4e0", border: "1px solid #f0d890", borderRadius: 8, padding: "12px 14px" }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a5a1a", display: "block", marginBottom: 6 }}>
                              Note for subcontractor (required)
                            </label>
                            <textarea
                              value={sendBackNote}
                              onChange={(e) => setSendBackNote(e.target.value)}
                              placeholder="Describe what needs to be fixed or completed…"
                              rows={3}
                              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #e0c878", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", background: "#fff", outline: "none" }}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                              <Btn variant="ghost" size="sm" onClick={() => setSendBackId(null)}>Cancel</Btn>
                              <Btn variant="secondary" size="sm" disabled={!sendBackNote.trim()} onClick={() => {
                                reject(l, sendBackNote.trim());
                                setSendBackId(null);
                                setSendBackNote("");
                              }}>Confirm send back</Btn>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {submittedWorkLines.map((wl, i, arr) => {
                  const sub = wl.assignedSub;
                  const pay = wl.payAmount ?? wl.invoiceLineAmount;
                  return (
                    <div key={wl.id} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        {sub ? (
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: sub.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                            {sub.initials}
                          </div>
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e8e6e1", color: "#9a968e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>?</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{sub?.name || "Unassigned"}</span>
                            <span style={{ fontSize: 10.5, color: "#5a7a80", background: "#e6f0f2", padding: "1px 6px", borderRadius: 4 }}>{(wl as WorkLineData & { invoiceNumber: string }).invoiceNumber}</span>
                          </div>
                          <div style={{ fontSize: 13, marginTop: 4 }}>{wl.title}</div>
                          {wl.completionNotes && (
                            <div style={{ marginTop: 8, padding: "8px 10px", background: "#fafaf8", borderLeft: "2px solid #dcd9d2", borderRadius: "0 6px 6px 0", fontSize: 12, color: "#4a4740", fontStyle: "italic" }}>
                              &quot;{wl.completionNotes}&quot;
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(pay)}</div>
                          <div style={{ fontSize: 11, color: "#8a8780", marginTop: 1 }}>work line</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10, paddingLeft: 46, flexWrap: "wrap" }}>
                        <Btn variant="success" size="sm" icon={<Icon.check />} onClick={() => approveWorkLine(wl)}>Approve</Btn>
                        <Btn variant="secondary" size="sm" onClick={() => {
                          setSendBackId(sendBackId === wl.id ? null : wl.id);
                          setSendBackNote("");
                        }}>Send back</Btn>
                        <Btn variant="ghost" size="sm" icon={<Icon.invoice />} onClick={() => setViewInvId(viewInvId === wl.id ? null : wl.id)}>
                          {viewInvId === wl.id ? "Hide invoice" : "View invoice"}
                        </Btn>
                      </div>
                      {viewInvId === wl.id && (() => {
                        const rec = invoiceRecords.find((r) => r.invoiceNumber === (wl as WorkLineData & { invoiceNumber: string }).invoiceNumber);
                        if (!rec) return null;
                        return (
                          <div style={{ marginTop: 10, paddingLeft: 46 }}>
                            <div style={{ background: "#fafaf8", border: "1px solid #e0eef0", borderRadius: 10, overflow: "hidden" }}>
                              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0eef0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600 }}>{rec.invoiceNumber} · {rec.customerName}</div>
                                  <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>{rec.serviceAddress || rec.customerAddress}</div>
                                </div>
                                <div style={{ fontSize: 12, color: "#5a7a80" }}>{rec.lineItems.length} line item{rec.lineItems.length !== 1 ? "s" : ""}</div>
                              </div>
                              {rec.lineItems.map((li, idx) => (
                                <div key={li.id} style={{ padding: "10px 16px", borderBottom: idx < rec.lineItems.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                    <div>
                                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{li.description}</div>
                                      <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>{li.workLines.length} work line{li.workLines.length !== 1 ? "s" : ""}</div>
                                    </div>
                                    <div style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt$(li.lineTotal)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {sendBackId === wl.id && (
                        <div style={{ marginTop: 10, paddingLeft: 46 }}>
                          <div style={{ background: "#fef4e0", border: "1px solid #f0d890", borderRadius: 8, padding: "12px 14px" }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a5a1a", display: "block", marginBottom: 6 }}>
                              Note for subcontractor (required)
                            </label>
                            <textarea
                              value={sendBackNote}
                              onChange={(e) => setSendBackNote(e.target.value)}
                              placeholder="Describe what needs to be fixed or completed…"
                              rows={3}
                              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #e0c878", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", background: "#fff", outline: "none" }}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                              <Btn variant="ghost" size="sm" onClick={() => setSendBackId(null)}>Cancel</Btn>
                              <Btn variant="secondary" size="sm" disabled={!sendBackNote.trim()} onClick={() => {
                                rejectWorkLine(wl, sendBackNote.trim());
                                setSendBackId(null);
                                setSendBackNote("");
                              }}>Confirm send back</Btn>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </Card>

          {/* In progress */}
          <Card pad={0}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>In progress</div>
              <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>
                {inProgress.length + inProgressWorkLines.length} items being worked on
              </div>
            </div>
            <Divider />
            {inProgress.map((l, i, arr) => {
              const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
              return (
                <div key={l.id} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: (i < arr.length - 1 || inProgressWorkLines.length > 0) ? "1px solid #f4f2ec" : "none" }}>
                  <Avatar sub={sub} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{l.desc}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{sub?.name} · {l.invNum}</div>
                  </div>
                  <StatusPill status={l.status} size="sm" />
                </div>
              );
            })}
            {inProgressWorkLines.map((wl, i, arr) => {
              const sub = wl.assignedSub;
              return (
                <div key={wl.id} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  {sub ? (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: sub.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                      {sub.initials}
                    </div>
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e8e6e1", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{wl.title}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{sub?.name || "Unassigned"} · {(wl as WorkLineData & { invoiceNumber: string }).invoiceNumber}</div>
                  </div>
                  <StatusPill status={wl.workStatus as "in_progress" | "assigned"} size="sm" />
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
              <div key={l.id} style={{ padding: "12px 20px", borderBottom: (i < arr.length - 1 || recentlyApprovedWorkLines.length > 0) ? "1px solid #f4f2ec" : "none" }}>
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
          {recentlyApprovedWorkLines.map((wl, i, arr) => {
            const sub = wl.assignedSub;
            return (
              <div key={wl.id} style={{ padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {sub ? (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: sub.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                      {sub.initials}
                    </div>
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e8e6e1", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wl.title}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{sub?.name || "Unassigned"}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt$(wl.payAmount ?? wl.invoiceLineAmount)}</div>
                </div>
              </div>
            );
          })}
          {recentlyApproved.length === 0 && recentlyApprovedWorkLines.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#a8a49c", fontSize: 12 }}>None yet this week</div>
          )}
        </Card>
      </div>
      {toast}
    </div>
  );
}
