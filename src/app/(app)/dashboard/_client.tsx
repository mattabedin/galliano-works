"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Invoice, Sub } from "@/lib/types";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

const ACCENT = "#c94a2a";

export function DashboardClient({ invoices, subs, invoiceRecords }: { invoices: Invoice[]; subs: Sub[]; invoiceRecords: InvoiceRecordData[] }) {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "supervisor">("admin");

  useEffect(() => {
    const stored = localStorage.getItem("galliano-role-v2");
    if (stored === "supervisor") setRole("supervisor");
  }, []);

  return (
    <DashboardScreen
      invoices={invoices}
      subs={subs}
      invoiceRecords={invoiceRecords}
      accent={ACCENT}
      role={role}
      goto={(page) => {
        const pathMap: Record<string, string> = {
          earnings: "subcontractors",
          profit: "profitability",
        };
        router.push("/" + (pathMap[page] ?? page));
      }}
    />
  );
}
