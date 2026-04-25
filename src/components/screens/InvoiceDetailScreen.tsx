"use client";

import { useState } from "react";
import {
  InvoiceRecordData, InvoiceLineItemData,
  INVOICE_STATUS_META, WORK_STATUS_META, APPROVAL_STATUS_META,
} from "@/lib/invoice-types";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { Sub, fmt$ } from "@/lib/types";
import { WorkLineModal } from "@/components/modals/WorkLineModal";
import { markInvoiceReviewed, closeInvoice, updateLineItemWorkRelated } from "@/lib/invoice-actions";

function formatDate(dateStr: string | Date) {
  if (!dateStr) return "—";
  const d = typeof dateStr === "string" ? new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00")) : dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ fontSize: 12, color: "#8a8780", width: 140, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "#1a1814" : "#b8b5ae", fontStyle: value ? "normal" : "italic" }}>
        {value || "Not provided"}
      </div>
    </div>
  );
}

function StatusPill({ status, type }: { status: string; type: "invoice" | "work" | "approval" }) {
  const meta =
    type === "invoice"
      ? INVOICE_STATUS_META[status as keyof typeof INVOICE_STATUS_META]
      : type === "work"
      ? WORK_STATUS_META[status as keyof typeof WORK_STATUS_META]
      : APPROVAL_STATUS_META[status as keyof typeof APPROVAL_STATUS_META];

  if (!meta) return null;
  const hasDot = "dot" in meta;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: meta.bg, color: meta.fg,
      fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {hasDot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: (meta as { dot: string }).dot }} />}
      {meta.label}
    </span>
  );
}

interface Props {
  invoice: InvoiceRecordData;
  subs: Sub[];
  onBack: () => void;
  onRefresh: () => void;
}

export function InvoiceDetailScreen({ invoice, subs, onBack, onRefresh }: Props) {
  const [showWorkLineModal, setShowWorkLineModal] = useState(false);
  const [selectedLineItems, setSelectedLineItems] = useState<string[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const hasWorkLines = invoice.workLineCount > 0;
  const workRelatedItems = invoice.lineItems.filter((li) => li.isWorkRelated);
  const itemsWithoutWorkLines = workRelatedItems.filter((li) => li.workLines.length === 0);

  async function handleToggleWorkRelated(lineItemId: string, current: boolean) {
    setToggling(lineItemId);
    try {
      await updateLineItemWorkRelated(lineItemId, !current);
      onRefresh();
    } finally {
      setToggling(null);
    }
  }

  async function handleMarkReviewed() {
    await markInvoiceReviewed(invoice.id);
    onRefresh();
  }

  async function handleCloseInvoice() {
    await closeInvoice(invoice.id);
    onRefresh();
  }

  function toggleLineItemSelect(id: string) {
    setSelectedLineItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const canCreateWorkLines = itemsWithoutWorkLines.length > 0;

  return (
    <div style={{ padding: "24px 28px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 960, margin: "0 auto" }}>
      {/* Back nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, color: "#8a8780", fontFamily: "inherit", padding: 0,
        }}>
          <Icon.chevron style={{ transform: "rotate(90deg)", width: 14, height: 14 }} />
          Back to Invoices
        </button>
        <div style={{ flex: 1 }} />
        {invoice.invoiceStatus === "imported" && (
          <Btn variant="secondary" size="md" onClick={handleMarkReviewed}>Mark Reviewed</Btn>
        )}
        {invoice.invoiceStatus === "completed" && (
          <Btn variant="secondary" size="md" onClick={handleCloseInvoice}>Close Invoice</Btn>
        )}
        {canCreateWorkLines && (
          <Btn
            variant="primary"
            size="md"
            icon={<Icon.plus />}
            onClick={() => {
              setSelectedLineItems(itemsWithoutWorkLines.map((li) => li.id));
              setShowWorkLineModal(true);
            }}
          >
            Create Work Lines
          </Btn>
        )}
      </div>

      {/* Invoice header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{invoice.invoiceNumber}</div>
              <div style={{ fontSize: 13, color: "#8a8780", marginTop: 4 }}>Imported {formatDate(invoice.createdAt)}</div>
            </div>
            <StatusPill status={invoice.invoiceStatus} type="invoice" />
          </div>
          <Divider />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <InfoRow label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
            <InfoRow label="Source" value={invoice.sourceType} />
            <InfoRow label="Invoice Total" value={fmt$(invoice.invoiceTotal)} />
          </div>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <SectionLabel>Customer</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{invoice.customerName}</div>
            <InfoRow label="Email" value={invoice.customerEmail} />
            <InfoRow label="Phone" value={invoice.customerPhone} />
            <InfoRow label="Billing Address" value={invoice.customerAddress} />
            <InfoRow label="Job Location" value={invoice.serviceAddress} />
          </div>
        </Card>
      </div>

      {/* Work line summary if they exist */}
      {hasWorkLines && (
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <SectionLabel>Work Lines</SectionLabel>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, color: "#8a8780" }}>
              {invoice.workLineCount} total
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invoice.lineItems.flatMap((li) => li.workLines).map((wl) => {
              const sub = wl.assignedSub;
              return (
                <div key={wl.id} style={{
                  display: "grid", gridTemplateColumns: "1fr auto auto auto",
                  gap: 12, alignItems: "center",
                  padding: "10px 12px", background: "#faf8f4", borderRadius: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{wl.title}</div>
                    {wl.description && <div style={{ fontSize: 12, color: "#6b6860", marginTop: 2 }}>{wl.description}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {fmt$(wl.invoiceLineAmount)}
                  </div>
                  {sub ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: sub.color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 600, flexShrink: 0,
                      }}>{sub.initials}</div>
                      <span style={{ fontSize: 12 }}>{sub.name.split(" ")[0]}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#b8b5ae", fontStyle: "italic" }}>Unassigned</span>
                  )}
                  <StatusPill status={wl.workStatus} type="work" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Line items table */}
      <Card pad={0}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionLabel>Invoice Line Items</SectionLabel>
          <div style={{ fontSize: 12, color: "#8a8780" }}>
            {invoice.lineItems.length} item{invoice.lineItems.length !== 1 ? "s" : ""} · {fmt$(invoice.invoiceTotal)} total
          </div>
        </div>
        <Divider />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#faf8f4" }}>
              {["#", "Description", "Qty", "Unit Price", "Line Total", "Notes", "Work Related", "Status"].map((h) => (
                <th key={h} style={{
                  textAlign: ["Line Total", "Unit Price", "Qty"].includes(h) ? "right" : "left",
                  padding: "10px 14px",
                  fontSize: 10.5, color: "#8a8780",
                  fontWeight: 500, letterSpacing: "0.06em",
                  textTransform: "uppercase", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li, i) => (
              <LineItemRow
                key={li.id}
                li={li}
                index={i}
                totalItems={invoice.lineItems.length}
                toggling={toggling === li.id}
                onToggleWorkRelated={() => handleToggleWorkRelated(li.id, li.isWorkRelated)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #ecebe6", background: "#faf8f4" }}>
              <td colSpan={4} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#6b6860" }}>Total</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {fmt$(invoice.invoiceTotal)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </Card>

      {showWorkLineModal && (
        <WorkLineModal
          invoice={invoice}
          preSelectedLineItemIds={selectedLineItems}
          onClose={() => setShowWorkLineModal(false)}
          onCreated={() => { setShowWorkLineModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function LineItemRow({
  li, index, totalItems, toggling, onToggleWorkRelated,
}: {
  li: InvoiceLineItemData;
  index: number;
  totalItems: number;
  toggling: boolean;
  onToggleWorkRelated: () => void;
}) {
  const hasWorkLine = li.workLines.length > 0;
  const wl = li.workLines[0];

  return (
    <tr style={{ borderBottom: index < totalItems - 1 ? "1px solid #f4f2ec" : "none" }}>
      <td style={{ padding: "12px 14px", color: "#8a8780", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
        {li.lineNumber}
      </td>
      <td style={{ padding: "12px 14px", maxWidth: 300 }}>
        <div style={{ fontWeight: 500 }}>{li.description}</div>
      </td>
      <td style={{ padding: "12px 14px", textAlign: "right", color: "#6b6860" }}>
        {li.quantity ?? <span style={{ color: "#b8b5ae" }}>—</span>}
      </td>
      <td style={{ padding: "12px 14px", textAlign: "right", color: "#6b6860", fontVariantNumeric: "tabular-nums" }}>
        {li.unitPrice != null ? fmt$(li.unitPrice) : <span style={{ color: "#b8b5ae" }}>—</span>}
      </td>
      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {fmt$(li.lineTotal)}
      </td>
      <td style={{ padding: "12px 14px", color: "#6b6860", fontSize: 12, maxWidth: 160 }}>
        {li.notes || <span style={{ color: "#b8b5ae" }}>—</span>}
      </td>
      <td style={{ padding: "12px 14px" }}>
        <button
          onClick={onToggleWorkRelated}
          disabled={toggling || hasWorkLine}
          title={hasWorkLine ? "Work line already created" : li.isWorkRelated ? "Mark as not work-related" : "Mark as work-related"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 999,
            background: li.isWorkRelated ? "#e8f1ec" : "#f4f4f2",
            color: li.isWorkRelated ? "#2f6848" : "#787570",
            border: "none", cursor: hasWorkLine || toggling ? "default" : "pointer",
            fontSize: 11.5, fontWeight: 500,
            opacity: toggling ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: li.isWorkRelated ? "#4a8a6e" : "#b8b5ae", flexShrink: 0 }} />
          {li.isWorkRelated ? "Yes" : "No"}
        </button>
      </td>
      <td style={{ padding: "12px 14px" }}>
        {hasWorkLine ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
              background: WORK_STATUS_META[wl.workStatus as keyof typeof WORK_STATUS_META]?.bg || "#f4f4f2",
              color: WORK_STATUS_META[wl.workStatus as keyof typeof WORK_STATUS_META]?.fg || "#787570",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: WORK_STATUS_META[wl.workStatus as keyof typeof WORK_STATUS_META]?.dot || "#b8b5ae" }} />
              {WORK_STATUS_META[wl.workStatus as keyof typeof WORK_STATUS_META]?.label || wl.workStatus}
            </span>
            {li.workLines.length > 1 && (
              <span style={{ fontSize: 11, color: "#8a8780" }}>+{li.workLines.length - 1} more</span>
            )}
          </div>
        ) : li.isWorkRelated ? (
          <span style={{ fontSize: 12, color: "#b8b5ae", fontStyle: "italic" }}>No work line</span>
        ) : (
          <span style={{ fontSize: 12, color: "#b8b5ae" }}>—</span>
        )}
      </td>
    </tr>
  );
}
