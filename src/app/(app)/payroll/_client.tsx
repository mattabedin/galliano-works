"use client";

import { useRouter } from "next/navigation";
import { Invoice, Sub } from "@/lib/types";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { PayrollScreen } from "@/components/screens/PayrollScreen";

export function PayrollClient({
  invoices, subs, invoiceRecords,
}: {
  invoices: Invoice[];
  subs: Sub[];
  invoiceRecords: InvoiceRecordData[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <PayrollScreen
      invoices={invoices}
      subs={subs}
      onUpdate={refresh}
      invoiceRecords={invoiceRecords}
      onRefresh={refresh}
    />
  );
}
