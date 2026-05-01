export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { MobilePreviewClient } from "./_client";

export default async function MobilePage() {
  const { subs, invoices, payHistory, invoiceRecords } = await getPageData([
    "subs", "invoices", "payHistory", "invoiceRecords",
  ]);
  return (
    <MobilePreviewClient
      invoices={invoices}
      subs={subs}
      payHistory={payHistory}
      invoiceRecords={invoiceRecords}
    />
  );
}
