export const dynamic = "force-dynamic";

import { GallianoApp } from "@/components/GallianoApp";
import { prisma } from "@/lib/db";
import { Invoice, Sub, PayHistory, LineItem } from "@/lib/types";
import { getInvoiceList } from "@/lib/invoice-actions";

async function getData() {
  const [dbSubs, dbInvoices, dbPayHistory, invoiceRecords] = await Promise.all([
    prisma.subcontractor.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.findMany({
      include: { lines: { include: { sub: true } } },
      orderBy: { number: "asc" },
    }),
    prisma.payHistory.findMany({ orderBy: { subId: "asc" } }),
    getInvoiceList(),
  ]);

  const subs: Sub[] = dbSubs.map((s) => ({
    id: s.id, name: s.name, trade: s.trade,
    rate: s.rate, color: s.color, initials: s.initials,
  }));

  const subMap = new Map(subs.map((s) => [s.id, s]));

  const invoices: Invoice[] = dbInvoices.map((inv) => ({
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

  const payHistory: PayHistory[] = dbPayHistory.map((p) => ({
    id: p.id, week: p.week, amount: p.amount, items: p.items, subId: p.subId,
  }));

  return { subs, invoices, payHistory, invoiceRecords };
}

export default async function Home() {
  const { subs, invoices, payHistory, invoiceRecords } = await getData();

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GallianoApp
        initialInvoices={invoices}
        initialSubs={subs}
        initialPayHistory={payHistory}
        initialInvoiceRecords={invoiceRecords}
      />
    </div>
  );
}
