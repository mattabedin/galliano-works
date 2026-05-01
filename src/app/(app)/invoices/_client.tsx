"use client";

import { useRouter } from "next/navigation";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { InvoicesScreen } from "@/components/screens/InvoicesScreen";

export function InvoicesClient({ invoices }: { invoices: InvoiceRecordData[] }) {
  const router = useRouter();
  return (
    <InvoicesScreen
      invoices={invoices}
      onSelectInvoice={(id) => router.push(`/invoices/${id}`)}
      onRefresh={() => router.refresh()}
    />
  );
}
