export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { ExpensesClient } from "./_client";

export default async function ExpensesPage() {
  const { subs, invoices } = await getPageData(["subs", "invoices"]);
  return <ExpensesClient invoices={invoices} subs={subs} />;
}
