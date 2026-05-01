"use client";

import { useState, useMemo } from "react";
import { InvoiceRecordData, INVOICE_STATUS_META } from "@/lib/invoice-types";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { fmt$ } from "@/lib/types";
import { ImportModal } from "@/components/modals/ImportModal";

const STATUS_ORDER: InvoiceRecordData["invoiceStatus"][] = [
  "imported", "reviewed", "work_lines_created", "in_progress", "completed", "closed",
];

function InvoiceStatusPill({ status }: { status: InvoiceRecordData["invoiceStatus"] }) {
  const meta = INVOICE_STATUS_META[status];
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

function SourceBadge({ source }: { source: string }) {
  return (
    <span style={{
      fontSize: 10.5, color: "#8a8780",
      background: "#f4f2ec", padding: "2px 7px",
      borderRadius: 4, fontWeight: 500, textTransform: "capitalize",
    }}>{source}</span>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  invoices: InvoiceRecordData[];
  onSelectInvoice: (id: string) => void;
  onRefresh: () => void;
}

export function InvoicesScreen({ invoices, onSelectInvoice, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.invoiceStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalValue = filtered.reduce((s, inv) => s + inv.invoiceTotal, 0);
  const workLineTotal = filtered.reduce((s, inv) => s + inv.workLineCount, 0);

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Invoices", value: String(filtered.length) },
          { label: "Total Value", value: fmt$(totalValue) },
          { label: "Work Lines Created", value: String(workLineTotal) },
          { label: "Pending Review", value: String(filtered.filter((i) => i.invoiceStatus === "imported").length) },
        ].map((card) => (
          <Card key={card.label} style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{card.value}</div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          {showSearch && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #dcd9d2", borderRadius: 8, padding: "0 12px", height: 32 }}>
              <Icon.search style={{ color: "#8a8780", flexShrink: 0 }} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices or customers…"
                style={{ border: "none", outline: "none", flex: 1, fontSize: 13, fontFamily: "inherit", color: "#1a1814", background: "transparent" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#8a8780" }}>
                  <Icon.x style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          )}
        </div>
        <Btn variant="secondary" size="md" icon={<Icon.search />} onClick={() => setShowSearch((v) => !v)}>
          Search
        </Btn>
        <div style={{ position: "relative" }}>
          <Btn variant={statusFilter !== "all" ? "primary" : "secondary"} size="md" icon={<Icon.filter />} onClick={() => setShowFilter((v) => !v)}>
            Filter{statusFilter !== "all" ? `: ${INVOICE_STATUS_META[statusFilter as InvoiceRecordData["invoiceStatus"]]?.label}` : ""}
          </Btn>
          {showFilter && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30,
              background: "#fff", border: "1px solid #ecebe6", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 6, minWidth: 200,
            }}>
              {[{ value: "all", label: "All statuses" }, ...STATUS_ORDER.map((s) => ({ value: s, label: INVOICE_STATUS_META[s].label }))].map((opt) => (
                <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowFilter(false); }} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", borderRadius: 7, border: "none",
                  background: statusFilter === opt.value ? "#f4f2ec" : "transparent",
                  fontSize: 13, fontWeight: statusFilter === opt.value ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit", color: "#1a1814",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Btn variant="primary" size="md" icon={<Icon.upload />} onClick={() => setShowImport(true)}>
          Import Invoices
        </Btn>
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <EmptyState hasInvoices={invoices.length > 0} onImport={() => setShowImport(true)} />
      ) : (
        <Card pad={0}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ecebe6" }}>
                {["Invoice #", "Customer", "Date", "Line Items", "Work Lines", "Total", "Status", "Source", ""].map((h) => (
                  <th key={h} style={{
                    textAlign: h === "Total" ? "right" : "left",
                    padding: "12px 14px",
                    fontSize: 10.5, color: "#8a8780",
                    fontWeight: 500, letterSpacing: "0.06em",
                    textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv.id)}
                  style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid #f4f2ec" : "none",
                    cursor: "pointer",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#faf8f4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "14px 14px" }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{inv.invoiceNumber}</span>
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    <div style={{ fontWeight: 500 }}>{inv.customerName}</div>
                    {inv.serviceAddress && (
                      <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>{inv.serviceAddress}</div>
                    )}
                  </td>
                  <td style={{ padding: "14px 14px", color: "#6b6860", whiteSpace: "nowrap" }}>
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td style={{ padding: "14px 14px", color: "#6b6860", textAlign: "center" }}>
                    {inv.lineItems.length}
                  </td>
                  <td style={{ padding: "14px 14px", textAlign: "center" }}>
                    {inv.workLineCount > 0 ? (
                      <span style={{ fontWeight: 600, color: "#2f6848" }}>{inv.workLineCount}</span>
                    ) : (
                      <span style={{ color: "#b8b5ae" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {fmt$(inv.invoiceTotal)}
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    <InvoiceStatusPill status={inv.invoiceStatus} />
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    <SourceBadge source={inv.sourceType} />
                  </td>
                  <td style={{ padding: "14px 10px" }}>
                    <div style={{ color: "#8a8780" }}>
                      <Icon.chevron style={{ transform: "rotate(-90deg)", width: 14, height: 14 }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasInvoices, onImport }: { hasInvoices: boolean; onImport: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 24px", gap: 16, textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: "#f4f2ec",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#8a8780",
      }}>
        <Icon.invoice style={{ width: 24, height: 24 }} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          {hasInvoices ? "No invoices match your filter" : "No invoices yet"}
        </div>
        <div style={{ fontSize: 13.5, color: "#8a8780", maxWidth: 320 }}>
          {hasInvoices
            ? "Try adjusting your search or filter to find what you're looking for."
            : "Import invoices via CSV or connect FreshBooks / QuickBooks to get started."}
        </div>
      </div>
      {!hasInvoices && (
        <Btn variant="primary" size="md" icon={<Icon.upload />} onClick={onImport}>
          Import your first invoice
        </Btn>
      )}
    </div>
  );
}
