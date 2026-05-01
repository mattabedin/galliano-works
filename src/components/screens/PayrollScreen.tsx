"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, LineItem, lineLabor, fmt$ } from "@/lib/types";
import { InvoiceRecordData, WorkLineData } from "@/lib/invoice-types";
import { Avatar } from "@/components/ui/Avatar";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { runPayroll } from "@/lib/actions";
import { markWorkLinesPaid } from "@/lib/invoice-actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  onUpdate: (invoices: Invoice[]) => void;
  invoiceRecords?: InvoiceRecordData[];
  onRefresh?: () => void;
}

interface LegacyPayEntry {
  kind: "legacy";
  sub: Sub;
  lines: (LineItem & { invNum?: string; client?: string })[];
  total: number;
}

interface WorkLinePayEntry {
  kind: "workline";
  sub: Sub;
  workLines: (WorkLineData & { invoiceNumber: string })[];
  total: number;
}

interface PayEntry {
  sub: Sub;
  legacyLines: (LineItem & { invNum?: string; client?: string })[];
  workLines: (WorkLineData & { invoiceNumber: string })[];
  total: number;
}

export function PayrollScreen({ invoices, subs, onUpdate, invoiceRecords = [], onRefresh }: Props) {
  const [toast, showToast] = useToast();
  const [selected, setSelected] = useState<PayEntry | null>(null);
  const [, startTransition] = useTransition();

  // Legacy approved lines
  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const approvedLegacy = allLines.filter((l) => l.status === "approved");

  // Approved WorkLines
  const allWorkLines: (WorkLineData & { invoiceNumber: string })[] = invoiceRecords.flatMap((rec) =>
    rec.lineItems.flatMap((li) =>
      li.workLines.map((wl) => ({ ...wl, invoiceNumber: rec.invoiceNumber }))
    )
  );
  const approvedWorkLines = allWorkLines.filter((wl) => wl.workStatus === "approved" || wl.payEligible);

  // Merge by sub
  const bySub: PayEntry[] = subs.map((sub) => {
    const legacyLines = approvedLegacy.filter((l) => l.sub?.id === sub.id || l.subId === sub.id);
    const workLines = approvedWorkLines.filter((wl) => wl.assignedSubId === sub.id);
    const total =
      legacyLines.reduce((s, l) => s + lineLabor(l), 0) +
      workLines.reduce((s, wl) => s + (wl.payAmount ?? wl.invoiceLineAmount), 0);
    return { sub, legacyLines, workLines, total };
  }).filter((x) => x.legacyLines.length > 0 || x.workLines.length > 0);

  const grandTotal = bySub.reduce((s, x) => s + x.total, 0);

  const handleRunPayroll = () => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) => l.status === "approved" ? { ...l, status: "paid" as const } : l),
    }));
    onUpdate(updated);
    setSelected(null);
    showToast(`Payroll generated · ${fmt$(grandTotal)} across ${bySub.length} subcontractors`, "success");

    const approvedWorkLineIds = approvedWorkLines.map((wl) => wl.id);
    startTransition(async () => {
      await runPayroll();
      if (approvedWorkLineIds.length > 0) {
        await markWorkLinesPaid(approvedWorkLineIds);
        onRefresh?.();
      }
    });
  };

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="secondary" size="md" icon={<Icon.download />}>Export all as PDF</Btn>
        <Btn variant="primary" size="md" icon={<Icon.payroll />} onClick={handleRunPayroll} disabled={bySub.length === 0}>
          Generate payroll · {fmt$(grandTotal)}
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 14, alignItems: "start" }}>
        <Card pad={0}>
          <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 20px", gap: 12, fontSize: 10.5, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <div>Subcontractor</div>
            <div style={{ textAlign: "right" }}>Items</div>
            <div style={{ textAlign: "right" }}>Expenses</div>
            <div style={{ textAlign: "right" }}>Pay</div>
            <div />
          </div>
          <Divider />
          {bySub.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13 }}>
              No approved items for this week
            </div>
          )}
          {bySub.map(({ sub, legacyLines, workLines, total }, i) => {
            const exp = legacyLines.reduce((s, l) => s + (l.expenses || 0), 0);
            const itemCount = legacyLines.length + workLines.length;
            return (
              <div key={sub.id} onClick={() => setSelected({ sub, legacyLines, workLines, total })} style={{
                padding: "14px 20px",
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 20px", gap: 12,
                alignItems: "center",
                borderBottom: i < bySub.length - 1 ? "1px solid #f4f2ec" : "none",
                cursor: "pointer",
                background: selected?.sub.id === sub.id ? "#fafaf8" : "#fff",
                transition: "background 100ms",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar sub={sub} size={32} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{sub.name}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{sub.trade}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{itemCount}</div>
                <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", color: "#6b6860" }}>{fmt$(exp)}</div>
                <div style={{ textAlign: "right", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(total)}</div>
                <Icon.chevronR style={{ color: "#b8b5ae" }} />
              </div>
            );
          })}
          {bySub.length > 0 && (
            <>
              <Divider />
              <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 20px", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Total</div>
                <div /><div />
                <div style={{ textAlign: "right", fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(grandTotal)}</div>
                <div />
              </div>
            </>
          )}
        </Card>

        {selected && <PayStubPreview entry={selected} onClose={() => setSelected(null)} showToast={showToast} />}
      </div>
      {toast}
    </div>
  );
}

function PayStubPreview({
  entry,
  onClose,
  showToast,
}: {
  entry: PayEntry;
  onClose: () => void;
  showToast: (msg: string, kind?: "success" | "info") => void;
}) {
  const { sub, legacyLines, workLines, total } = entry;
  const exp = legacyLines.reduce((s, l) => s + (l.expenses || 0), 0);
  const allItems = legacyLines.length + workLines.length;

  return (
    <Card pad={0} style={{ position: "sticky", top: 0 }}>
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#8a8780" }}>Pay summary preview</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 1 }}>{sub.name}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="secondary" size="sm" icon={<Icon.download />} onClick={() => showToast("Downloaded PDF", "success")}>PDF</Btn>
          <Btn variant="ghost" size="sm" onClick={onClose}><Icon.x /></Btn>
        </div>
      </div>
      <Divider />

      <div style={{ padding: 20, background: "#f4f2ec" }}>
        <div style={{
          background: "#fff", borderRadius: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
          padding: 32, fontFamily: "Georgia, serif",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottom: "2px solid #1a1814" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8780", fontFamily: "ui-monospace, monospace" }}>Payroll summary</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: "-0.01em" }}>Galliano Enterprises, Ltd. Co.</div>
              <div style={{ fontSize: 11, color: "#6b6860", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>Week of Apr 20 — Apr 26, 2026</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 10.5, color: "#6b6860", fontFamily: "ui-monospace, monospace", lineHeight: 1.6 }}>
              <div>PAY #{Math.floor(Math.random() * 900 + 100)}-{sub.id.toUpperCase()}</div>
              <div>Generated Apr 23, 2026</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 }}>
            <div>
              <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8780", fontFamily: "ui-monospace, monospace" }}>Pay to</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{sub.name}</div>
              <div style={{ fontSize: 11, color: "#6b6860", marginTop: 2 }}>{sub.trade} · 1099 subcontractor</div>
            </div>
            <div>
              <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8780", fontFamily: "ui-monospace, monospace" }}>Summary</div>
              <div style={{ fontSize: 11, color: "#1a1814", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Completed items</span><span>{allItems}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Labor total</span><span>{fmt$(total)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pass-through expenses</span><span>{fmt$(exp)}</span></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1814" }}>
                  <th style={{ textAlign: "left", padding: "6px 0", fontSize: 9.5, letterSpacing: "0.1em" }}>INVOICE</th>
                  <th style={{ textAlign: "left", padding: "6px 0", fontSize: 9.5, letterSpacing: "0.1em" }}>DESCRIPTION</th>
                  <th style={{ textAlign: "right", padding: "6px 0", fontSize: 9.5, letterSpacing: "0.1em" }}>PAY</th>
                </tr>
              </thead>
              <tbody>
                {legacyLines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #ecebe6" }}>
                    <td style={{ padding: "8px 0", verticalAlign: "top" }}>{l.invNum}</td>
                    <td style={{ padding: "8px 12px 8px 0", fontFamily: "Georgia, serif", fontSize: 12 }}>
                      {l.desc}
                      <div style={{ fontSize: 10, color: "#8a8780", fontFamily: "ui-monospace, monospace", marginTop: 2 }}>{l.client}</div>
                    </td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt$(lineLabor(l))}</td>
                  </tr>
                ))}
                {workLines.map((wl) => (
                  <tr key={wl.id} style={{ borderBottom: "1px solid #ecebe6" }}>
                    <td style={{ padding: "8px 0", verticalAlign: "top" }}>{wl.invoiceNumber}</td>
                    <td style={{ padding: "8px 12px 8px 0", fontFamily: "Georgia, serif", fontSize: 12 }}>
                      {wl.title}
                      <div style={{ fontSize: 10, color: "#8a8780", fontFamily: "ui-monospace, monospace", marginTop: 2 }}>{wl.customerName}</div>
                    </td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt$(wl.payAmount ?? wl.invoiceLineAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #1a1814" }}>
                  <td colSpan={2} style={{ padding: "10px 0", fontSize: 11, fontWeight: 600 }}>TOTAL DUE</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", fontFamily: "Georgia, serif" }}>{fmt$(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: 28, fontSize: 9.5, color: "#8a8780", lineHeight: 1.6, fontFamily: "ui-monospace, monospace" }}>
            Paid via ACH on Fri, Apr 25, 2026. Questions? Reply to pay@galliano.co. Retain for your 1099 records.
          </div>
        </div>
      </div>
    </Card>
  );
}
