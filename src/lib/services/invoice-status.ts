import { prisma } from "@/lib/db";

type InvoiceStatus =
  | "imported"
  | "reviewed"
  | "work_lines_created"
  | "in_progress"
  | "completed"
  | "closed";

export async function recomputeInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoiceRecord.findUnique({
    where: { id: invoiceId },
    include: { lineItems: { include: { workLines: true } } },
  });
  if (!invoice) return;

  const allWorkLines = invoice.lineItems.flatMap((li) => li.workLines);
  const hasWorkLines = allWorkLines.length > 0;
  const allDone = hasWorkLines && allWorkLines.every(
    (wl) => wl.workStatus === "completed" || wl.workStatus === "approved" || wl.workStatus === "paid"
  );
  const anyActive = allWorkLines.some(
    (wl) => wl.workStatus === "in_progress" || wl.workStatus === "assigned"
  );

  let status: InvoiceStatus = invoice.invoiceStatus as InvoiceStatus;

  if (status === "closed") return; // Never auto-reopen a closed invoice

  if (!hasWorkLines && (status === "imported" || status === "reviewed")) {
    // no change needed
  } else if (hasWorkLines && (status === "imported" || status === "reviewed")) {
    status = "work_lines_created";
  } else if (anyActive) {
    status = "in_progress";
  } else if (allDone) {
    status = "completed";
  }

  await prisma.invoiceRecord.update({
    where: { id: invoiceId },
    data: { invoiceStatus: status },
  });
}
