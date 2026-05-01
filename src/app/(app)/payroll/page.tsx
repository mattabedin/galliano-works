export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { PayrollClient } from "./_client";

export default async function PayrollPage() {
  const { subs, invoices, invoiceRecords } = await getPageData(["subs", "invoices", "invoiceRecords"]);
  return <PayrollClient invoices={invoices} subs={subs} invoiceRecords={invoiceRecords} />;
}
