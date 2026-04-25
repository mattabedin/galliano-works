"use client";

import { useState } from "react";
import {
  InvoiceRecordData, InvoiceLineItemData, WorkLineData,
  INVOICE_STATUS_META, WORK_STATUS_META,
} from "@/lib/invoice-types";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { Sub, fmt$ } from "@/lib/types";
import { WorkLineModal } from "@/components/modals/WorkLineModal";
import {
  markInvoiceReviewed, closeInvoice, updateLineItemWorkRelated,
  updateInvoiceRecord, updateInvoiceLineItem, updateWorkLine,
  createInvoiceLineItem, deleteInvoiceLineItem,
} from "@/lib/invoice-actions";

function formatDate(dateStr: string | Date) {
  if (!dateStr) return "—";
  const d = typeof dateStr === "string"
    ? new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"))
    : dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function FieldInput({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a8780" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 32, borderRadius: 7, border: "1px solid #dcd9d2",
          padding: "0 10px", fontSize: 13, fontFamily: "inherit",
          color: "#1a1814", background: "#fff", width: "100%", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function StatusPill({ status, type }: { status: string; type: "invoice" | "work" }) {
  const meta = type === "invoice"
    ? INVOICE_STATUS_META[status as keyof typeof INVOICE_STATUS_META]
    : WORK_STATUS_META[status as keyof typeof WORK_STATUS_META];
  if (!meta) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: meta.bg, color: meta.fg,
      fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
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
  const [editingHeader, setEditingHeader] = useState(false);

  const workRelatedItems = invoice.lineItems.filter((li) => li.isWorkRelated);
  const itemsWithoutWorkLines = workRelatedItems.filter((li) => li.workLines.length === 0);
  const hasWorkLines = invoice.workLineCount > 0;
  const canCreateWorkLines = itemsWithoutWorkLines.length > 0;

  async function handleMarkReviewed() {
    await markInvoiceReviewed(invoice.id);
    onRefresh();
  }

  async function handleCloseInvoice() {
    await closeInvoice(invoice.id);
    onRefresh();
  }

  return (
    <div style={{ padding: "24px 28px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 980, margin: "0 auto" }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none",
          border: "none", cursor: "pointer", fontSize: 13, color: "#8a8780",
          fontFamily: "inherit", padding: 0,
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
          <Btn variant="primary" size="md" icon={<Icon.plus />} onClick={() => setShowWorkLineModal(true)}>
            Create Work Lines
          </Btn>
        )}
      </div>

      {/* Header cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <InvoiceHeaderCard
          invoice={invoice}
          editing={editingHeader}
          onToggleEdit={() => setEditingHeader((v) => !v)}
          onSaved={() => { setEditingHeader(false); onRefresh(); }}
        />
        <CustomerCard invoice={invoice} onSaved={onRefresh} />
      </div>

      {/* Work lines */}
      {hasWorkLines && (
        <WorkLinesCard
          invoice={invoice}
          onRefresh={onRefresh}
        />
      )}

      {/* Line items */}
      <LineItemsCard
        invoice={invoice}
        onRefresh={onRefresh}
      />

      {showWorkLineModal && (
        <WorkLineModal
          invoice={invoice}
          preSelectedLineItemIds={itemsWithoutWorkLines.map((li) => li.id)}
          onClose={() => setShowWorkLineModal(false)}
          onCreated={() => { setShowWorkLineModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ── Invoice header card (editable) ────────────────────────── */

function InvoiceHeaderCard({
  invoice, editing, onToggleEdit, onSaved,
}: {
  invoice: InvoiceRecordData;
  editing: boolean;
  onToggleEdit: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    invoiceTotal: String(invoice.invoiceTotal),
  });

  function set(key: keyof typeof fields) {
    return (v: string) => setFields((f) => ({ ...f, [key]: v }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateInvoiceRecord(invoice.id, {
        invoiceNumber: fields.invoiceNumber,
        invoiceDate: fields.invoiceDate,
        invoiceTotal: parseFloat(fields.invoiceTotal) || 0,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          {editing ? (
            <input
              value={fields.invoiceNumber}
              onChange={(e) => set("invoiceNumber")(e.target.value)}
              style={{
                fontSize: 20, fontWeight: 700, border: "none", borderBottom: "2px solid #1a1814",
                outline: "none", fontFamily: "inherit", color: "#1a1814", background: "transparent", width: 180,
              }}
            />
          ) : (
            <div style={{ fontSize: 20, fontWeight: 700 }}>{invoice.invoiceNumber}</div>
          )}
          <div style={{ fontSize: 13, color: "#8a8780", marginTop: 4 }}>
            Imported {formatDate(invoice.createdAt)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <StatusPill status={invoice.invoiceStatus} type="invoice" />
          {editing ? (
            <>
              <Btn variant="ghost" size="sm" onClick={onToggleEdit} disabled={saving}>Cancel</Btn>
              <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Btn>
            </>
          ) : (
            <Btn variant="ghost" size="sm" icon={<Icon.pencil />} onClick={onToggleEdit}>Edit</Btn>
          )}
        </div>
      </div>
      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
        {editing ? (
          <>
            <FieldInput label="Invoice Date" type="date" value={fields.invoiceDate} onChange={set("invoiceDate")} />
            <FieldInput label="Invoice Total ($)" type="number" value={fields.invoiceTotal} onChange={set("invoiceTotal")} />
          </>
        ) : (
          <>
            <InfoRow label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
            <InfoRow label="Source" value={invoice.sourceType} />
            <InfoRow label="Invoice Total" value={fmt$(invoice.invoiceTotal)} />
          </>
        )}
      </div>
    </Card>
  );
}

/* ── Customer card (editable) ────────────────────────────────── */

function CustomerCard({ invoice, onSaved }: { invoice: InvoiceRecordData; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail ?? "",
    customerPhone: invoice.customerPhone ?? "",
    customerAddress: invoice.customerAddress ?? "",
    serviceAddress: invoice.serviceAddress ?? "",
  });

  function set(key: keyof typeof fields) {
    return (v: string) => setFields((f) => ({ ...f, [key]: v }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateInvoiceRecord(invoice.id, {
        customerName: fields.customerName,
        customerEmail: fields.customerEmail || undefined,
        customerPhone: fields.customerPhone || undefined,
        customerAddress: fields.customerAddress || undefined,
        serviceAddress: fields.serviceAddress || undefined,
      });
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <SectionLabel>Customer</SectionLabel>
        {editing ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Btn>
          </div>
        ) : (
          <Btn variant="ghost" size="sm" icon={<Icon.pencil />} onClick={() => setEditing(true)}>Edit</Btn>
        )}
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <FieldInput label="Customer Name *" value={fields.customerName} onChange={set("customerName")} />
          <FieldInput label="Email" type="email" value={fields.customerEmail} onChange={set("customerEmail")} />
          <FieldInput label="Phone" value={fields.customerPhone} onChange={set("customerPhone")} />
          <FieldInput label="Billing Address" value={fields.customerAddress} onChange={set("customerAddress")} />
          <FieldInput label="Job Location" value={fields.serviceAddress} onChange={set("serviceAddress")} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{invoice.customerName}</div>
          <InfoRow label="Email" value={invoice.customerEmail} />
          <InfoRow label="Phone" value={invoice.customerPhone} />
          <InfoRow label="Billing Address" value={invoice.customerAddress} />
          <InfoRow label="Job Location" value={invoice.serviceAddress} />
        </div>
      )}
    </Card>
  );
}

/* ── Work lines card (each work line editable) ──────────────── */

function WorkLinesCard({ invoice, onRefresh }: { invoice: InvoiceRecordData; onRefresh: () => void }) {
  const allWorkLines = invoice.lineItems.flatMap((li) => li.workLines);
  return (
    <Card style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <SectionLabel>Work Lines</SectionLabel>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "#8a8780" }}>{invoice.workLineCount} total</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {allWorkLines.map((wl) => (
          <WorkLineRow key={wl.id} wl={wl} onSaved={onRefresh} />
        ))}
      </div>
    </Card>
  );
}

function WorkLineRow({ wl, onSaved }: { wl: WorkLineData; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    title: wl.title,
    description: wl.description ?? "",
    adminNotes: wl.adminNotes ?? "",
    serviceAddress: wl.serviceAddress ?? "",
    payAmount: wl.payAmount != null ? String(wl.payAmount) : "",
    dueDate: wl.dueDate ? new Date(wl.dueDate).toISOString().slice(0, 10) : "",
  });

  function set(key: keyof typeof fields) {
    return (v: string) => setFields((f) => ({ ...f, [key]: v }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateWorkLine(wl.id, {
        title: fields.title,
        description: fields.description || null,
        adminNotes: fields.adminNotes || null,
        serviceAddress: fields.serviceAddress || null,
        payAmount: fields.payAmount ? parseFloat(fields.payAmount) : null,
        dueDate: fields.dueDate ? new Date(fields.dueDate) : null,
      });
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const sub = wl.assignedSub;

  if (editing) {
    return (
      <div style={{ border: "1.5px solid #1a1814", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldInput label="Work Line Title *" value={fields.title} onChange={set("title")} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a8780", display: "block", marginBottom: 4 }}>Description</label>
            <textarea
              value={fields.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={2}
              style={{
                width: "100%", borderRadius: 7, border: "1px solid #dcd9d2",
                padding: "8px 10px", fontSize: 13, fontFamily: "inherit",
                color: "#1a1814", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
          <FieldInput label="Job Location" value={fields.serviceAddress} onChange={set("serviceAddress")} />
          <FieldInput label="Due Date" type="date" value={fields.dueDate} onChange={set("dueDate")} />
          <FieldInput label="Pay Amount ($)" type="number" value={fields.payAmount} onChange={set("payAmount")} />
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a8780", display: "block", marginBottom: 4 }}>Admin Notes</label>
            <textarea
              value={fields.adminNotes}
              onChange={(e) => set("adminNotes")(e.target.value)}
              rows={2}
              style={{
                width: "100%", borderRadius: 7, border: "1px solid #dcd9d2",
                padding: "8px 10px", fontSize: 13, fontFamily: "inherit",
                color: "#1a1814", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving || !fields.title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto auto auto auto",
      gap: 12, alignItems: "center",
      padding: "10px 12px", background: "#faf8f4", borderRadius: 8,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{wl.title}</div>
        {wl.description && <div style={{ fontSize: 12, color: "#6b6860", marginTop: 2 }}>{wl.description}</div>}
        {wl.adminNotes && (
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2, fontStyle: "italic" }}>
            Note: {wl.adminNotes}
          </div>
        )}
        {wl.dueDate && (
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>
            Due {formatDate(wl.dueDate)}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {wl.payAmount != null ? fmt$(wl.payAmount) : fmt$(wl.invoiceLineAmount)}
      </div>
      {sub ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
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
      <Btn variant="ghost" size="sm" icon={<Icon.pencil />} onClick={() => setEditing(true)} />
    </div>
  );
}

/* ── Line items card (each row inline-editable) ─────────────── */

function LineItemsCard({ invoice, onRefresh }: { invoice: InvoiceRecordData; onRefresh: () => void }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <Card pad={0}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionLabel>Invoice Line Items</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#8a8780" }}>
            {invoice.lineItems.length} item{invoice.lineItems.length !== 1 ? "s" : ""} · {fmt$(invoice.invoiceTotal)} total
          </div>
          {!addingNew && (
            <Btn variant="secondary" size="sm" icon={<Icon.plus />} onClick={() => setAddingNew(true)}>
              Add line item
            </Btn>
          )}
        </div>
      </div>
      <Divider />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#faf8f4" }}>
            {["#", "Description", "Qty", "Unit Price", "Line Total", "Notes", "Work Related", "Status", ""].map((h) => (
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
              onRefresh={onRefresh}
            />
          ))}
          {addingNew && (
            <NewLineItemRow
              invoiceId={invoice.id}
              nextLineNumber={invoice.lineItems.length + 1}
              onSaved={() => { setAddingNew(false); onRefresh(); }}
              onCancel={() => setAddingNew(false)}
            />
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #ecebe6", background: "#faf8f4" }}>
            <td colSpan={4} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#6b6860" }}>Total</td>
            <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {fmt$(invoice.invoiceTotal)}
            </td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

function NewLineItemRow({
  invoiceId, nextLineNumber, onSaved, onCancel,
}: {
  invoiceId: string;
  nextLineNumber: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    description: "",
    quantity: "",
    unitPrice: "",
    lineTotal: "",
    notes: "",
  });

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = { ...fields, [key]: e.target.value };
      if ((key === "quantity" || key === "unitPrice") && next.quantity && next.unitPrice) {
        next.lineTotal = String(
          Math.round(parseFloat(next.quantity) * parseFloat(next.unitPrice) * 100) / 100
        );
      }
      setFields(next);
    };
  }

  async function handleSave() {
    if (!fields.description.trim() || !fields.lineTotal) return;
    setSaving(true);
    try {
      await createInvoiceLineItem(invoiceId, {
        description: fields.description.trim(),
        quantity: fields.quantity ? parseFloat(fields.quantity) : null,
        unitPrice: fields.unitPrice ? parseFloat(fields.unitPrice) : null,
        lineTotal: parseFloat(fields.lineTotal),
        notes: fields.notes || null,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr style={{ borderTop: "1px solid #f4f2ec", background: "#fffef8" }}>
      <td style={{ padding: "10px 14px", color: "#8a8780", fontSize: 12 }}>{nextLineNumber}</td>
      <td style={{ padding: "8px 8px" }}>
        <input
          autoFocus
          value={fields.description}
          onChange={set("description")}
          placeholder="Line item description…"
          style={inlineInputStyle({ flex: true })}
        />
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input
          type="number"
          value={fields.quantity}
          onChange={set("quantity")}
          placeholder="Qty"
          style={inlineInputStyle({ width: 60, textAlign: "right" })}
        />
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input
          type="number"
          value={fields.unitPrice}
          onChange={set("unitPrice")}
          placeholder="0.00"
          style={inlineInputStyle({ width: 80, textAlign: "right" })}
        />
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input
          type="number"
          value={fields.lineTotal}
          onChange={set("lineTotal")}
          placeholder="0.00"
          style={inlineInputStyle({ width: 80, textAlign: "right" })}
        />
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input
          value={fields.notes}
          onChange={set("notes")}
          placeholder="Notes…"
          style={inlineInputStyle({ width: 140 })}
        />
      </td>
      <td colSpan={2} />
      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <Btn variant="ghost" size="sm" onClick={onCancel} disabled={saving}>✕</Btn>
          <Btn
            variant="primary" size="sm"
            onClick={handleSave}
            disabled={saving || !fields.description.trim() || !fields.lineTotal}
          >
            {saving ? "…" : "✓"}
          </Btn>
        </div>
      </td>
    </tr>
  );
}

function LineItemRow({
  li, index, totalItems, onRefresh,
}: {
  li: InvoiceLineItemData;
  index: number;
  totalItems: number;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [fields, setFields] = useState({
    description: li.description,
    quantity: li.quantity != null ? String(li.quantity) : "",
    unitPrice: li.unitPrice != null ? String(li.unitPrice) : "",
    lineTotal: String(li.lineTotal),
    notes: li.notes ?? "",
  });

  const hasWorkLine = li.workLines.length > 0;
  const wl = li.workLines[0];

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateInvoiceLineItem(li.id, {
        description: fields.description,
        quantity: fields.quantity ? parseFloat(fields.quantity) : null,
        unitPrice: fields.unitPrice ? parseFloat(fields.unitPrice) : null,
        lineTotal: parseFloat(fields.lineTotal) || 0,
        notes: fields.notes || null,
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleWorkRelated() {
    setToggling(true);
    try {
      await updateLineItemWorkRelated(li.id, !li.isWorkRelated);
      onRefresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const result = await deleteInvoiceLineItem(li.id);
      if (result.success) {
        onRefresh();
      } else {
        setDeleteError(result.error || "Delete failed");
        setConfirmDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  const borderBottom = index < totalItems - 1 ? "1px solid #f4f2ec" : "none";

  if (editing) {
    return (
      <tr style={{ borderBottom, background: "#fefdfb" }}>
        <td style={{ padding: "10px 14px", color: "#8a8780", fontSize: 12 }}>{li.lineNumber}</td>
        <td style={{ padding: "8px 8px" }}>
          <input
            autoFocus
            value={fields.description}
            onChange={set("description")}
            style={inlineInputStyle({ flex: true })}
          />
        </td>
        <td style={{ padding: "8px 6px" }}>
          <input
            type="number"
            value={fields.quantity}
            onChange={set("quantity")}
            placeholder="—"
            style={inlineInputStyle({ width: 60, textAlign: "right" })}
          />
        </td>
        <td style={{ padding: "8px 6px" }}>
          <input
            type="number"
            value={fields.unitPrice}
            onChange={set("unitPrice")}
            placeholder="—"
            style={inlineInputStyle({ width: 80, textAlign: "right" })}
          />
        </td>
        <td style={{ padding: "8px 6px" }}>
          <input
            type="number"
            value={fields.lineTotal}
            onChange={set("lineTotal")}
            style={inlineInputStyle({ width: 80, textAlign: "right" })}
          />
        </td>
        <td style={{ padding: "8px 6px" }}>
          <input
            value={fields.notes}
            onChange={set("notes")}
            placeholder="Notes…"
            style={inlineInputStyle({ width: 140 })}
          />
        </td>
        <td colSpan={2} />
        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <Btn variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>✕</Btn>
            <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving || !fields.description.trim()}>
              {saving ? "…" : "✓"}
            </Btn>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom }}>
      <td style={{ padding: "12px 14px", color: "#8a8780", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
        {li.lineNumber}
      </td>
      <td style={{ padding: "12px 14px", maxWidth: 280 }}>
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
          onClick={handleToggleWorkRelated}
          disabled={toggling || hasWorkLine}
          title={hasWorkLine ? "Work line already created" : li.isWorkRelated ? "Mark as not work-related" : "Mark as work-related"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 999,
            background: li.isWorkRelated ? "#e8f1ec" : "#f4f4f2",
            color: li.isWorkRelated ? "#2f6848" : "#787570",
            border: "none", cursor: hasWorkLine || toggling ? "default" : "pointer",
            fontSize: 11.5, fontWeight: 500, opacity: toggling ? 0.6 : 1, fontFamily: "inherit",
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
      <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
        {deleteError && (
          <div style={{ fontSize: 11, color: "#a8442f", marginBottom: 4, maxWidth: 160 }}>{deleteError}</div>
        )}
        {confirmDelete ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: "#a8442f", marginRight: 2 }}>Delete?</span>
            <Btn variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "…" : "Yes"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setConfirmDelete(false); setDeleteError(""); }}>No</Btn>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            <Btn variant="ghost" size="sm" icon={<Icon.pencil />} onClick={() => setEditing(true)} />
            <span title={hasWorkLine ? "Remove work lines first" : "Delete line item"}>
              <Btn
                variant="ghost" size="sm"
                icon={<Icon.trash style={{ color: hasWorkLine ? "#b8b5ae" : "#a8442f" }} />}
                onClick={() => setConfirmDelete(true)}
                disabled={hasWorkLine}
              />
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}

function inlineInputStyle({ flex, width, textAlign }: { flex?: boolean; width?: number; textAlign?: string } = {}): React.CSSProperties {
  return {
    height: 30, borderRadius: 6, border: "1px solid #dcd9d2",
    padding: "0 8px", fontSize: 12.5, fontFamily: "inherit",
    color: "#1a1814", background: "#fff",
    ...(flex ? { width: "100%" } : { width }),
    ...(textAlign ? { textAlign: textAlign as React.CSSProperties["textAlign"] } : {}),
    boxSizing: "border-box",
  };
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
