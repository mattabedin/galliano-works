export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { ApprovalsClient } from "./_client";

export default async function ApprovalsPage() {
  const { subs, invoices, invoiceRecords } = await getPageData(["subs", "invoices", "invoiceRecords"]);
  return <ApprovalsClient invoices={invoices} subs={subs} invoiceRecords={invoiceRecords} />;
}
