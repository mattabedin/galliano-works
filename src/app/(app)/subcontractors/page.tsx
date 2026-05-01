export const dynamic = "force-dynamic";

import { getPageData } from "@/lib/data";
import { SubEarningsScreen } from "@/components/screens/SubEarningsScreen";

export default async function SubcontractorsPage() {
  const { subs, invoices, payHistory } = await getPageData(["subs", "invoices", "payHistory"]);
  return <SubEarningsScreen invoices={invoices} subs={subs} payHistory={payHistory} />;
}
