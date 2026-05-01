export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { DashboardClient } from "./_client";

export default async function DashboardPage() {
  const { subs, invoices } = await getPageData(["subs", "invoices"]);
  return <DashboardClient invoices={invoices} subs={subs} />;
}
