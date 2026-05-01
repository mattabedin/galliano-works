"use client";

import { useRouter } from "next/navigation";
import { Invoice, Sub } from "@/lib/types";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

const ACCENT = "#c94a2a";

export function DashboardClient({ invoices, subs }: { invoices: Invoice[]; subs: Sub[] }) {
  const router = useRouter();
  return (
    <DashboardScreen
      invoices={invoices}
      subs={subs}
      accent={ACCENT}
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
