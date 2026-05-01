export const dynamic = "force-dynamic";

import { getInvoiceList } from "@/lib/invoice-actions";
import { InvoicesClient } from "./_client";

export default async function InvoicesPage() {
  const invoices = await getInvoiceList();
  return <InvoicesClient invoices={invoices} />;
}
