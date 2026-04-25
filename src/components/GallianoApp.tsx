"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Invoice, Sub, PayHistory } from "@/lib/types";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandBar } from "@/components/layout/CommandBar";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { InvoicesScreen } from "@/components/screens/InvoicesScreen";
import { InvoiceDetailScreen } from "@/components/screens/InvoiceDetailScreen";
import { BoardScreen } from "@/components/screens/BoardScreen";
import { ApprovalsScreen } from "@/components/screens/ApprovalsScreen";
import { PayrollScreen } from "@/components/screens/PayrollScreen";
import { SubEarningsScreen } from "@/components/screens/SubEarningsScreen";
import { ExpensesScreen } from "@/components/screens/ExpensesScreen";
import { ProfitabilityScreen } from "@/components/screens/ProfitabilityScreen";
import { MobileSubScreen } from "@/components/screens/MobileSubScreen";
import { Avatar } from "@/components/ui/Avatar";
import { Btn } from "@/components/ui/Btn";

const ACCENT = "#c94a2a";

type Role = "admin" | "subcontractor";
type Page = "dashboard" | "invoices" | "board" | "approvals" | "payroll" | "earnings" | "expenses" | "profit";

const PAGE_META: Record<Page, { title: string; sub: (state: { invoices: Invoice[]; subs: Sub[]; invoiceRecords?: InvoiceRecordData[] }) => string }> = {
  dashboard: { title: "Overview",       sub: () => "Week of Apr 20 — Apr 26, 2026" },
  invoices:  { title: "Invoices",       sub: ({ invoiceRecords }) => invoiceRecords ? `${invoiceRecords.length} invoice${invoiceRecords.length !== 1 ? "s" : ""} · ${invoiceRecords.reduce((s, i) => s + i.lineItems.length, 0)} line items` : "CSV import · work line management" },
  board:     { title: "Assignments",    sub: () => "Drag to distribute work" },
  approvals: { title: "Approvals",      sub: () => "Review before payroll" },
  payroll:   { title: "Payroll",        sub: () => "Weekly run" },
  earnings:  { title: "Subcontractors", sub: ({ subs }) => `${subs.length} active` },
  expenses:  { title: "Expenses",       sub: () => "Materials, travel, other" },
  profit:    { title: "Profitability",  sub: () => "Per invoice & line" },
};

interface Props {
  initialInvoices: Invoice[];
  initialSubs: Sub[];
  initialPayHistory: PayHistory[];
  initialInvoiceRecords: InvoiceRecordData[];
}

export function GallianoApp({ initialInvoices, initialSubs, initialPayHistory, initialInvoiceRecords }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [page, setPage] = useState<Page>("dashboard");
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const invoiceRecords = initialInvoiceRecords;
  const subs = initialSubs;
  const payHistory = initialPayHistory;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdkOpen((o) => !o); }
      if (e.key === "Escape") setCmdkOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogin = (r: Role) => { setAuthed(true); setRole(r); setPage(r === "admin" ? "dashboard" : "dashboard"); };
  const handleLogout = () => setAuthed(false);
  const handleRoleSwitch = () => setRole(role === "admin" ? "subcontractor" : "admin");

  if (!authed) {
    return <LoginScreen accent={ACCENT} onLogin={handleLogin} />;
  }

  if (role === "subcontractor") {
    const currentSubId = subs[currentSubIdx]?.id || subs[0]?.id;
    return (
      <div style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at 30% 20%, #3a342c 0%, #1a1814 70%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, gap: 56 }}>
        <div style={{ color: "#e8e4dc", maxWidth: 300 }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, fontWeight: 600 }}>Subcontractor app</div>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 42, fontWeight: 400, margin: "12px 0 0", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
            Built for<br />the job site.
          </h2>
          <p style={{ fontSize: 13.5, opacity: 0.7, lineHeight: 1.65, marginTop: 18 }}>
            Subcontractors see only their assigned work. One tap to start, one tap to submit. Pay status is always visible.
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {subs.map((s, i) => (
              <button key={s.id} onClick={() => setCurrentSubIdx(i)} style={{
                padding: "6px 10px", borderRadius: 999, fontFamily: "inherit",
                border: currentSubIdx === i ? `1.5px solid ${s.color}` : "1px solid rgba(255,255,255,0.15)",
                background: currentSubIdx === i ? "rgba(255,255,255,0.1)" : "transparent",
                color: "#e8e4dc", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12,
              }}>
                <Avatar sub={s} size={18} />
                {s.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Btn variant="secondary" size="sm" onClick={() => setRole("admin")}>← Back to admin</Btn>
          </div>
        </div>

        <PhoneFrame>
          <MobileSubScreen
            invoices={invoices}
            subs={subs}
            payHistory={payHistory}
            currentSubId={currentSubId}
            onUpdate={setInvoices}
          />
        </PhoneFrame>
      </div>
    );
  }

  const meta = PAGE_META[page];

  function refreshInvoiceRecords() {
    router.refresh();
  }

  const selectedInvoice = selectedInvoiceId
    ? invoiceRecords.find((r) => r.id === selectedInvoiceId) || null
    : null;

  const invoiceDetailTitle = selectedInvoice
    ? selectedInvoice.invoiceNumber
    : meta.title;
  const invoiceDetailSub = selectedInvoice
    ? `${selectedInvoice.customerName} · ${selectedInvoice.lineItems.length} line items`
    : meta.sub({ invoices, subs, invoiceRecords });

  const pageContent = {
    dashboard: <DashboardScreen invoices={invoices} subs={subs} accent={ACCENT} goto={(p) => setPage(p as Page)} />,
    invoices: selectedInvoice ? (
      <InvoiceDetailScreen
        invoice={selectedInvoice}
        subs={subs}
        onBack={() => setSelectedInvoiceId(null)}
        onRefresh={refreshInvoiceRecords}
      />
    ) : (
      <InvoicesScreen
        invoices={invoiceRecords}
        onSelectInvoice={(id) => setSelectedInvoiceId(id)}
        onRefresh={refreshInvoiceRecords}
      />
    ),
    board:     <BoardScreen invoices={invoices} subs={subs} onUpdate={setInvoices} />,
    approvals: <ApprovalsScreen invoices={invoices} subs={subs} onUpdate={setInvoices} />,
    payroll:   <PayrollScreen invoices={invoices} subs={subs} onUpdate={setInvoices} />,
    earnings:  <SubEarningsScreen invoices={invoices} subs={subs} payHistory={payHistory} />,
    expenses:  <ExpensesScreen invoices={invoices} subs={subs} onUpdate={setInvoices} />,
    profit:    <ProfitabilityScreen invoices={invoices} />,
  }[page];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf8f4", fontSize: 14, color: "#1a1814" }}>
      <Sidebar
        page={page}
        setPage={(p) => { setPage(p as Page); setSelectedInvoiceId(null); }}
        accent={ACCENT}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
        invoices={invoices}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title={page === "invoices" ? invoiceDetailTitle : meta.title}
          sub={page === "invoices" ? invoiceDetailSub : meta.sub({ invoices, subs, invoiceRecords })}
          onCmdk={() => setCmdkOpen(true)}
          accent={ACCENT}
        />
        <div key={page + (selectedInvoiceId || "")} style={{ flex: 1, overflowY: "auto", position: "relative", animation: "page-in 280ms cubic-bezier(0.25, 1, 0.5, 1)" }}>
          {pageContent}
        </div>
      </div>

      {cmdkOpen && (
        <CommandBar onClose={() => setCmdkOpen(false)} setPage={(p) => setPage(p as Page)} />
      )}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 360, height: 720, background: "#1a1814",
      borderRadius: 44, padding: 10,
      boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08) inset",
      position: "relative",
    }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: "#faf8f4", position: "relative" }}>
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 110, height: 30, background: "#000", borderRadius: 18, zIndex: 10 }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", fontSize: 13, fontWeight: 600, color: "#fafaf8", zIndex: 11 }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><path d="M1 7h2v2H1zM5 5h2v4H5zM9 3h2v6H9zM13 1h2v8h-2z"/></svg>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="1" width="18" height="8" rx="2"/><rect x="3" y="3" width="13" height="4" rx="1" fill="currentColor"/></svg>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
