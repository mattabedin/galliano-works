"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandBar } from "@/components/layout/CommandBar";

const ACCENT = "#c94a2a";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard":      { title: "Overview",        sub: "Week of Apr 20 — Apr 26, 2026" },
  "/invoices":       { title: "Invoices",         sub: "CSV import · work line management" },
  "/board":          { title: "Assignments",      sub: "Drag to distribute work" },
  "/approvals":      { title: "Approvals",        sub: "Review before payroll" },
  "/payroll":        { title: "Payroll",          sub: "Weekly run" },
  "/subcontractors": { title: "Subcontractors",   sub: "Earnings & history" },
  "/expenses":       { title: "Expenses",         sub: "Materials, travel, other" },
  "/profitability":  { title: "Profitability",    sub: "Per invoice & line" },
  "/mobile":         { title: "Mobile Preview",   sub: "Subcontractor view" },
};

interface Props {
  children: React.ReactNode;
  badges: { board: number; approvals: number };
}

export function AppShell({ children, badges }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("galliano-auth");
    if (stored === "true") setAuthed(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdkOpen((o) => !o); }
      if (e.key === "Escape") setCmdkOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("galliano-auth");
    setAuthed(false);
    router.push("/login");
  }, [router]);

  if (!mounted) return null;
  if (!authed) {
    router.push("/login");
    return null;
  }

  const isMobile = pathname === "/mobile";
  const isInvoiceDetail = pathname.startsWith("/invoices/");

  let title = "Galliano Works";
  let sub = "";
  if (isInvoiceDetail) {
    title = "Invoice Detail";
    sub = "Invoice management";
  } else {
    const meta = PAGE_TITLES[pathname];
    if (meta) { title = meta.title; sub = meta.sub; }
  }

  if (isMobile) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#1a1814", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, gap: 56 }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf8f4", fontSize: 14, color: "#1a1814" }}>
      <Sidebar
        badges={badges}
        accent={ACCENT}
        onPreviewMobile={() => router.push("/mobile")}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title={title}
          sub={sub}
          onCmdk={() => setCmdkOpen(true)}
          accent={ACCENT}
        />
        <div
          key={pathname}
          style={{ flex: 1, overflowY: "auto", position: "relative", animation: "page-in 280ms cubic-bezier(0.25, 1, 0.5, 1)" }}
        >
          {children}
        </div>
      </div>

      {cmdkOpen && (
        <CommandBar
          onClose={() => setCmdkOpen(false)}
          setPage={(p) => { router.push("/" + p); setCmdkOpen(false); }}
        />
      )}
    </div>
  );
}
