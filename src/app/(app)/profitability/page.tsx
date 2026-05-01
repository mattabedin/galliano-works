export const dynamic = "force-dynamic";

import { getLegacyInvoices } from "@/lib/data";
import { ProfitabilityScreen } from "@/components/screens/ProfitabilityScreen";

export default async function ProfitabilityPage() {
  const invoices = await getLegacyInvoices();
  return <ProfitabilityScreen invoices={invoices} />;
}
