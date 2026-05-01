"use client";

import { useRouter } from "next/navigation";
import { Invoice, Sub } from "@/lib/types";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { BoardScreen } from "@/components/screens/BoardScreen";

export function BoardClient({
  invoices, subs, invoiceRecords,
}: {
  invoices: Invoice[];
  subs: Sub[];
  invoiceRecords: InvoiceRecordData[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <BoardScreen
      invoices={invoices}
      subs={subs}
      onUpdate={refresh}
      invoiceRecords={invoiceRecords}
      onRefresh={refresh}
    />
  );
}
