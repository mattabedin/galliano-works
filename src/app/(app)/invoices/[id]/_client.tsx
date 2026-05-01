"use client";

import { useRouter } from "next/navigation";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { Sub } from "@/lib/types";
import { InvoiceDetailScreen } from "@/components/screens/InvoiceDetailScreen";

export function InvoiceDetailClient({ invoice, subs }: { invoice: InvoiceRecordData; subs: Sub[] }) {
  const router = useRouter();
  return (
    <InvoiceDetailScreen
      invoice={invoice}
      subs={subs}
      onBack={() => router.push("/invoices")}
      onRefresh={() => router.refresh()}
    />
  );
}
