export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getInvoiceDetail } from "@/lib/invoice-actions";
import { getSubs } from "@/lib/data";
import { InvoiceDetailClient } from "./_client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, subs] = await Promise.all([getInvoiceDetail(id), getSubs()]);
  if (!invoice) notFound();
  return <InvoiceDetailClient invoice={invoice} subs={subs} />;
}
