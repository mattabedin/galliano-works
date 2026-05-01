import { prisma } from "@/lib/db";
import type { ParsedInvoice } from "@/lib/invoice-types";

export async function persistImportedInvoices(
  invoices: ParsedInvoice[],
  fileName: string,
  sourceType: string
): Promise<{ batchId: string; invoiceCount: number; lineItemCount: number }> {
  const totalLineItems = invoices.reduce((s, inv) => s + inv.lineItems.length, 0);

  const batch = await prisma.importBatch.create({
    data: {
      sourceType,
      originalFileName: fileName,
      totalRows: totalLineItems,
      successfulRows: totalLineItems,
      failedRows: 0,
      status: "completed",
    },
  });

  await Promise.all(
    invoices.map((inv) =>
      prisma.invoiceRecord.create({
        data: {
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          customerName: inv.customerName,
          customerEmail: inv.customerEmail || null,
          customerPhone: inv.customerPhone || null,
          customerAddress: inv.customerAddress || null,
          serviceAddress: inv.serviceAddress || null,
          invoiceTotal: inv.invoiceTotal || inv.lineItems.reduce((s, l) => s + l.lineTotal, 0),
          sourceType,
          invoiceStatus: "imported",
          importBatchId: batch.id,
          lineItems: {
            create: inv.lineItems.map((li, idx) => ({
              lineNumber: idx + 1,
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
              notes: li.notes,
              isWorkRelated: true,
            })),
          },
        },
      })
    )
  );

  return { batchId: batch.id, invoiceCount: invoices.length, lineItemCount: totalLineItems };
}
