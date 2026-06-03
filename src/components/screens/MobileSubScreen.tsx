"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, PayHistory, LineItem, lineLabor, fmt$ } from "@/lib/types";
import { InvoiceRecordData, WorkLineData } from "@/lib/invoice-types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { updateLineStatus } from "@/lib/actions";
import { updateWorkLineStatus } from "@/lib/invoice-actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  payHistory: PayHistory[];
  currentSubId: string;
  onUpdate: (invoices: Invoice[]) => void;
  invoiceRecords?: InvoiceRecordData[];
  onRefresh?: () => void;
}

const MOCK_QUOTES = [
  { id: "q1", address: "2847 Elmwood Ave", description: "HVAC full system inspection + filter swap", amount: 340, status: "accepted" as const },
  { id: "q2", address: "510 N Maple St, Unit 4", description: "Electrical outlet troubleshooting — 3 rooms", amount: 285, status: "pending" as const },
  { id: "q3", address: "19 Clover Hill Rd", description: "Interior repaint — master bedroom + hallway", amount: 560, status: "pending" as const },
];

export function MobileSubScreen({ invoices, subs, payHistory, currentSubId, onUpdate, invoiceRecords = [], onRefresh }: Props) {
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<"jobs" | "earnings" | "quotes">("jobs");
  const [, startTransition] = useTransition();

  // Quotes tab state
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteAddress, setQuoteAddress] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  const sub = subs.find((s) => s.id === currentSubId) || subs[0];

  // Legacy LineItems for this sub
  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client, address: inv.address }))
  );
  const myLines = allLines.filter((l) => l.sub?.id === currentSubId || l.subId === currentSubId);
  const activeLegacy = myLines.filter((l) => ["assigned", "in_progress", "submitted"].includes(l.status));
  const paidLegacy = myLines.filter((l) => l.status === "approved" || l.status === "paid");

  // WorkLines for this sub
  const allWorkLines: (WorkLineData & { invoiceNumber: string })[] = invoiceRecords.flatMap((rec) =>
    rec.lineItems.flatMap((li) =>
      li.workLines.map((wl) => ({ ...wl, invoiceNumber: rec.invoiceNumber }))
    )
  );
  const myWorkLines = allWorkLines.filter((wl) => wl.assignedSubId === currentSubId);
  const activeWorkLines = myWorkLines.filter((wl) =>
    ["assigned", "in_progress", "submitted", "completed"].includes(wl.workStatus)
  );
  const approvedWorkLines = myWorkLines.filter((wl) => wl.workStatus === "approved" || wl.workStatus === "paid");

  const toBePaidLegacy = paidLegacy.filter((l) => l.status === "approved").reduce((s, l) => s + lineLabor(l), 0);
  const toBePaidWorkLines = approvedWorkLines.filter((wl) => wl.workStatus === "approved").reduce((s, wl) => s + (wl.payAmount ?? wl.invoiceLineAmount), 0);
  const toBePaid = toBePaidLegacy + toBePaidWorkLines;
  const approvedCount = paidLegacy.filter((l) => l.status === "approved").length + approvedWorkLines.filter((wl) => wl.workStatus === "approved").length;

  const paidYTD = payHistory.filter((p) => p.subId === currentSubId).reduce((s, p) => s + p.amount, 0);

  const setLegacyStatus = (lineId: string, status: string) => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) => l.id === lineId ? { ...l, status: status as LineItem["status"] } : l),
    }));
    onUpdate(updated);
    startTransition(async () => { await updateLineStatus(lineId, status); });
  };

  const setWorkLineStatus = (workLineId: string, status: string, notes?: string) => {
    startTransition(async () => {
      await updateWorkLineStatus(workLineId, status);
      onRefresh?.();
    });
  };

  const activeTotal = activeLegacy.length + activeWorkLines.length;

  const handleQuoteSubmit = () => {
    setQuoteSubmitted(true);
    showToast("Quote submitted successfully", "success");
    setTimeout(() => {
      setQuoteFormOpen(false);
      setQuoteSubmitted(false);
      setQuoteAddress("");
      setQuoteDesc("");
      setQuoteAmount("");
    }, 2000);
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "44px 20px 14px", background: "#1a1814", color: "#fafaf8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar sub={sub} size={36} />
            <div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>Good morning,</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{sub?.name.split(" ")[0]}</div>
            </div>
          </div>
          <button style={{ background: "rgba(255,255,255,0.1)", border: "none", width: 32, height: 32, borderRadius: 8, color: "#fafaf8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.logout />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "14px 20px 0", background: "#1a1814", display: "flex", gap: 4 }}>
        {[
          { id: "jobs" as const, label: `Jobs · ${activeTotal}` },
          { id: "earnings" as const, label: "Earnings" },
          { id: "quotes" as const, label: "Quotes" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 8px", fontSize: 13, fontWeight: 500,
            background: tab === t.id ? "#fafaf8" : "transparent",
            color: tab === t.id ? "#1a1814" : "rgba(250,250,248,0.6)",
            border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 84px" }}>
        {tab === "jobs" && (
          <>
            {toBePaid > 0 && (
              <div style={{ background: "#e8f1ec", border: "1px solid #c9e0d1", borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2f6848", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon.money />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt$(toBePaid)} coming Friday</div>
                  <div style={{ fontSize: 11.5, color: "#4a4740" }}>Direct deposit · {approvedCount} items approved</div>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>
              My jobs · This week
            </div>

            {activeTotal === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13, background: "#fff", borderRadius: 12, border: "1px solid #ecebe6" }}>
                No active jobs — nice work 🎉
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeLegacy.map((l) => (
                <MobileJobCard
                  key={l.id}
                  kind="legacy"
                  title={l.desc}
                  invNum={l.invNum}
                  client={l.client}
                  address={l.address}
                  pay={fmt$(lineLabor(l))}
                  status={l.status as "assigned" | "in_progress" | "submitted"}
                  adminNote={l.note || undefined}
                  onStart={() => { setLegacyStatus(l.id, "in_progress"); showToast("Marked as in progress"); }}
                  onComplete={(notes) => { setLegacyStatus(l.id, "submitted"); showToast("Sent for approval", "success"); }}
                  onNoteToast={(msg) => showToast(msg, "success")}
                />
              ))}
              {activeWorkLines.map((wl) => (
                <MobileJobCard
                  key={wl.id}
                  kind="workline"
                  title={wl.title}
                  invNum={wl.invoiceNumber}
                  client={wl.customerName}
                  address={wl.serviceAddress || undefined}
                  pay={fmt$(wl.payAmount ?? wl.invoiceLineAmount)}
                  status={wl.workStatus as "assigned" | "in_progress" | "submitted"}
                  adminNote={wl.adminNotes || undefined}
                  onStart={() => { setWorkLineStatus(wl.id, "in_progress"); showToast("Marked as in progress"); }}
                  onComplete={(notes) => { setWorkLineStatus(wl.id, "submitted", notes); showToast("Sent for approval", "success"); }}
                  onNoteToast={(msg) => showToast(msg, "success")}
                />
              ))}
            </div>
          </>
        )}

        {tab === "earnings" && (
          <>
            <div style={{ background: "linear-gradient(165deg, #1a1814 0%, #2b2520 100%)", color: "#fafaf8", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Earnings YTD</div>
              <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {fmt$(paidYTD + toBePaid)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                {fmt$(toBePaid)} pending · {fmt$(paidYTD)} paid
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 3, alignItems: "flex-end", height: 40 }}>
                {[0.3, 0.5, 0.7, 0.55, 0.8, 0.65, 0.9].map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${v * 100}%`, background: `${sub?.color || "#6b8cbf"}cc`, borderRadius: 2 }} />
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>
              Pay history
            </div>
            <div style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, overflow: "hidden" }}>
              {payHistory.filter((p) => p.subId === currentSubId).map((p, i, arr) => (
                <div key={p.id} style={{ padding: "14px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8f1ec", color: "#2f6848", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon.pdf />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Week of {p.week}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{p.items} items · Paid</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(p.amount)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "quotes" && (
          <>
            {/* Submit Quote Button */}
            <Btn
              variant="primary"
              size="md"
              icon={<Icon.plus />}
              style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
              onClick={() => { setQuoteFormOpen(!quoteFormOpen); setQuoteSubmitted(false); }}
            >
              {quoteFormOpen ? "Cancel" : "Submit a Quote"}
            </Btn>

            {/* Quote Form Panel */}
            {quoteFormOpen && (
              <div style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                {quoteSubmitted ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#2f6848" }}>Quote submitted!</div>
                    <div style={{ fontSize: 12, color: "#8a8780", marginTop: 4 }}>We'll review and get back to you.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#1a1814" }}>New Quote</div>
                    <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>
                      Property address
                    </label>
                    <input
                      type="text"
                      value={quoteAddress}
                      onChange={(e) => setQuoteAddress(e.target.value)}
                      placeholder="123 Main St, City, ST"
                      style={{ width: "100%", padding: "9px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 12, boxSizing: "border-box" }}
                    />
                    <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>
                      Description of work
                    </label>
                    <textarea
                      value={quoteDesc}
                      onChange={(e) => setQuoteDesc(e.target.value)}
                      placeholder="Describe the job scope..."
                      style={{ width: "100%", minHeight: 70, padding: 10, border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }}
                    />
                    <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>
                      Estimated amount ($)
                    </label>
                    <input
                      type="number"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ width: "100%", padding: "9px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }}
                    />
                    <Btn
                      variant="success"
                      size="md"
                      icon={<Icon.check />}
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={handleQuoteSubmit}
                    >
                      Submit quote
                    </Btn>
                  </>
                )}
              </div>
            )}

            {/* Previous Quotes */}
            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>
              Previously submitted
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MOCK_QUOTES.map((q) => (
                <div key={q.id} style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#8a8780", marginBottom: 3 }}>📍 {q.address}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{q.description}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginBottom: 6 }}>{fmt$(q.amount)}</div>
                      <StatusPill status={q.status === "accepted" ? "approved" : "submitted"} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {toast}
    </div>
  );
}

function MobileJobCard({
  kind,
  title,
  invNum,
  client,
  address,
  pay,
  status,
  adminNote,
  onStart,
  onComplete,
  onNoteToast,
}: {
  kind: "legacy" | "workline";
  title: string;
  invNum?: string;
  client?: string;
  address?: string;
  pay: string;
  status: "assigned" | "in_progress" | "submitted" | "completed";
  adminNote?: string;
  onStart: () => void;
  onComplete: (notes: string) => void;
  onNoteToast: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(status === "in_progress");
  const [notes, setNotes] = useState("");

  // Photo upload state
  const [beforePhoto, setBeforePhoto] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState(false);

  // Notes thread state
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Price selection state (for assigned status)
  const [selectedService, setSelectedService] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [displayPay, setDisplayPay] = useState(pay);

  const pillStatus = status === "completed" ? "submitted" : status;

  const PRICE_LIST = [
    { label: "-- Select from price list --", value: "", disabled: true },
    { label: "HVAC filter replacement — $180", value: "HVAC filter replacement — $180" },
    { label: "Electrical troubleshooting — $95/hr", value: "Electrical troubleshooting — $95/hr" },
    { label: "Plumbing drain clearing — $350", value: "Plumbing drain clearing — $350" },
    { label: "Interior painting (per room) — $280", value: "Interior painting (per room) — $280" },
    { label: "General inspection — $120", value: "General inspection — $120" },
    { label: "Custom / other", value: "custom" },
  ];

  const handleServiceChange = (val: string) => {
    setSelectedService(val);
    if (val && val !== "custom") {
      const priceMatch = val.match(/\$(\d+)/);
      if (priceMatch) {
        setDisplayPay(`$${priceMatch[1]}`);
      }
    } else if (val === "custom") {
      setDisplayPay(pay);
    }
  };

  const handleCustomPriceChange = (val: string) => {
    setCustomPrice(val);
    if (val) setDisplayPay(`$${val}`);
  };

  const MOCK_NOTES = [
    { id: "n1", role: "admin" as const, name: "Admin", timestamp: "Apr 22 · 9:41 AM", text: "Check with building super before cutting power" },
    { id: "n2", role: "sub" as const, name: "You", timestamp: "Apr 22 · 10:03 AM", text: "Confirmed with super, good to go" },
  ];

  return (
    <div style={{ background: "#fff", border: adminNote ? "1.5px solid #f0d890" : kind === "workline" ? "1px solid #e0eef0" : "1px solid #ecebe6", borderRadius: 12, overflow: "hidden" }}>
      {adminNote && (
        <div style={{ background: "#fef4e0", borderBottom: "1px solid #f0d890", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a5a1a", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>Note from admin</div>
            <div style={{ fontSize: 12.5, color: "#5a3a0a", lineHeight: 1.45 }}>{adminNote}</div>
          </div>
        </div>
      )}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 14, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: kind === "workline" ? "#5a7a80" : "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{invNum}</div>
            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35, marginTop: 3 }}>{title}</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{client}</div>
            {address && <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>📍 {address}</div>}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{displayPay}</div>
            <div style={{ marginTop: 6 }}><StatusPill status={pillStatus} size="sm" /></div>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <Divider />
          <div style={{ padding: 14 }}>
            {status === "assigned" && (
              <>
                {/* Price selection */}
                <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 6 }}>
                  Select service type
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  style={{ width: "100%", padding: "9px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fafaf8", marginBottom: 12, boxSizing: "border-box", cursor: "pointer" }}
                >
                  {PRICE_LIST.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                  ))}
                </select>
                {selectedService === "custom" && (
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      placeholder="Describe the work..."
                      style={{ width: "100%", padding: "9px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }}
                    />
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => handleCustomPriceChange(e.target.value)}
                      placeholder="Price ($)"
                      style={{ width: "100%", padding: "9px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                )}
                <Btn variant="primary" size="md" style={{ width: "100%", justifyContent: "center" }} onClick={onStart}>
                  Start job
                </Btn>
              </>
            )}
            {status === "in_progress" && (
              <>
                {/* Photo upload section */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", marginBottom: 8 }}>Job photos</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    {/* Before photo */}
                    <div
                      onClick={() => setBeforePhoto(true)}
                      style={{ flex: 1, height: 80, border: beforePhoto ? "1.5px solid #2f6848" : "1.5px dashed #c5c1b8", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", background: beforePhoto ? "#e8f1ec" : "#fafaf8" }}
                    >
                      {beforePhoto ? (
                        <>
                          <span style={{ fontSize: 18 }}>✓</span>
                          <span style={{ fontSize: 11, color: "#2f6848", fontWeight: 500 }}>Photo added</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 20 }}>📷</span>
                          <span style={{ fontSize: 11, color: "#8a8780" }}>Add before photo</span>
                        </>
                      )}
                    </div>
                    {/* After photo */}
                    <div
                      onClick={() => setAfterPhoto(true)}
                      style={{ flex: 1, height: 80, border: afterPhoto ? "1.5px solid #2f6848" : "1.5px dashed #c5c1b8", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", background: afterPhoto ? "#e8f1ec" : "#fafaf8" }}
                    >
                      {afterPhoto ? (
                        <>
                          <span style={{ fontSize: 18 }}>✓</span>
                          <span style={{ fontSize: 11, color: "#2f6848", fontWeight: 500 }}>Photo added</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 20 }}>📷</span>
                          <span style={{ fontSize: 11, color: "#8a8780" }}>Add after photo</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#a8a49c", textAlign: "center" }}>Both photos required before submitting</div>
                </div>

                <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 6 }}>
                  Completion notes (optional)
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you complete? Any issues?"
                  style={{ width: "100%", minHeight: 60, padding: 10, border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                <Btn variant="success" size="md" icon={<Icon.check />} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
                  onClick={() => onComplete(notes)}>
                  Mark complete & submit
                </Btn>
              </>
            )}
            {(status === "submitted" || status === "completed") && (
              <div style={{ padding: 12, background: "#f0ebf7", borderRadius: 8, fontSize: 12.5, color: "#5c3d8a", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon.clock />
                Waiting for admin approval
              </div>
            )}
          </div>

          {/* Notes thread section */}
          <Divider />
          <div style={{ padding: "0 14px 14px" }}>
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 0 0", display: "flex", alignItems: "center", gap: 6, width: "100%", fontFamily: "inherit" }}
            >
              <span style={{ fontSize: 14 }}>💬</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "#4a4740", flex: 1, textAlign: "left" }}>Notes (2)</span>
              <span style={{ fontSize: 11, color: "#8a8780" }}>{notesOpen ? "▲" : "▼"}</span>
            </button>

            {notesOpen && (
              <div style={{ marginTop: 10 }}>
                {/* Mock notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {MOCK_NOTES.map((n) => (
                    <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: n.role === "admin" ? "#1a1814" : "#5a7a80", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{n.role === "admin" ? "A" : "M"}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1a1814" }}>{n.name}</span>
                          <span style={{ fontSize: 10, color: "#a8a49c" }}>{n.role === "admin" ? "Admin" : "You"}</span>
                          <span style={{ fontSize: 10, color: "#c5c1b8" }}>·</span>
                          <span style={{ fontSize: 10, color: "#a8a49c" }}>{n.timestamp}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#4a4740", lineHeight: 1.45, background: n.role === "admin" ? "#f4f2ec" : "#e8f1ec", padding: "8px 10px", borderRadius: 8 }}>
                          {n.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add note input */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && noteText.trim()) {
                        setNoteText("");
                        onNoteToast("Note sent");
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (noteText.trim()) {
                        setNoteText("");
                        onNoteToast("Note sent");
                      }
                    }}
                    style={{ padding: "8px 14px", background: "#1a1814", color: "#fafaf8", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
