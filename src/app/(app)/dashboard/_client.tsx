"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Invoice, Sub } from "@/lib/types";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

const ACCENT = "#c94a2a";

export function DashboardClient({ invoices, subs }: { invoices: Invoice[]; subs: Sub[] }) {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "supervisor">("admin");

  useEffect(() => {
    const stored = localStorage.getItem("galliano-role");
    if (stored === "supervisor") setRole("supervisor");
  }, []);

  return (
    <DashboardScreen
      invoices={invoices}
      subs={subs}
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
