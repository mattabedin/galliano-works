"use client";

import { useRouter } from "next/navigation";
import { Invoice, Sub } from "@/lib/types";
import { ExpensesScreen } from "@/components/screens/ExpensesScreen";

export function ExpensesClient({ invoices, subs }: { invoices: Invoice[]; subs: Sub[] }) {
  const router = useRouter();
  return (
    <ExpensesScreen
      invoices={invoices}
      subs={subs}
      onUpdate={() => router.refresh()}
    />
  );
}
