export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { DashboardClient } from "./_client";

export default async function DashboardPage() {
  const { subs, invoices, invoiceRecords } = await getPageData(["subs", "invoices", "invoiceRecords"]);
  return <DashboardClient invoices={invoices} subs={subs} invoiceRecords={invoiceRecords} />;
}
