import { prisma } from "@/lib/db";
import { Invoice, Sub, PayHistory, LineItem } from "@/lib/types";
import { getInvoiceList, getInvoiceDetail } from "@/lib/invoice-actions";
import type { InvoiceRecordData } from "@/lib/invoice-types";

export async function getSubs(): Promise<Sub[]> {
  const rows = await prisma.subcontractor.findMany({ orderBy: { name: "asc" } });
  return rows.map((s) => ({
    id: s.id, name: s.name, trade: s.trade,
    rate: s.rate, color: s.color, initials: s.initials,
  }));
}

export async function getLegacyInvoices(subs?: Sub[]): Promise<Invoice[]> {
  const subList = subs ?? (await getSubs());
  const subMap = new Map(subList.map((s) => [s.id, s]));

  const rows = await prisma.invoice.findMany({
    include: { lines: { include: { sub: true } } },
    orderBy: { number: "asc" },
  });

  return rows.map((inv) => ({
    id: inv.id, number: inv.number, client: inv.client,
    address: inv.address, issued: inv.issued, due: inv.due, source: inv.source,
    lines: inv.lines.map((l): LineItem => ({
      id: l.id, desc: l.desc, invoice: l.invoice,
      laborPct: l.laborPct, expenses: l.expenses,
      status: l.status as LineItem["status"],
      note: l.note,
      invoiceId: l.invoiceId,
      subId: l.subId,
      sub: l.subId ? (subMap.get(l.subId) || null) : null,
    })),
  }));
}

export async function getPayHistory(): Promise<PayHistory[]> {
  const rows = await prisma.payHistory.findMany({ orderBy: { subId: "asc" } });
  return rows.map((p) => ({
    id: p.id, week: p.week, amount: p.amount, items: p.items, subId: p.subId,
  }));
}

export async function getPageData(sections: Array<"subs" | "invoices" | "payHistory" | "invoiceRecords">) {
  const needs = new Set(sections);
  const subs = needs.has("subs") || needs.has("invoices") ? await getSubs() : undefined;
  const [invoices, payHistory, invoiceRecords] = await Promise.all([
    needs.has("invoices") ? getLegacyInvoices(subs) : undefined,
    needs.has("payHistory") ? getPayHistory() : undefined,
    needs.has("invoiceRecords") ? getInvoiceList() : undefined,
  ]);
  return { subs: subs ?? [], invoices: invoices ?? [], payHistory: payHistory ?? [], invoiceRecords: invoiceRecords ?? [] };
}

export { getInvoiceList, getInvoiceDetail };
export type { InvoiceRecordData };
