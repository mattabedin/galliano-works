export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { BoardClient } from "./_client";

export default async function BoardPage() {
  const { subs, invoices, invoiceRecords } = await getPageData(["subs", "invoices", "invoiceRecords"]);
  return <BoardClient invoices={invoices} subs={subs} invoiceRecords={invoiceRecords} />;
}
