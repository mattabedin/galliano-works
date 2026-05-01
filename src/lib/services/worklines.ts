import { prisma } from "@/lib/db";
import { recomputeInvoiceStatus } from "./invoice-status";

export async function assignWorkLineToSub(workLineId: string, subId: string): Promise<void> {
  const wl = await prisma.workLine.update({
    where: { id: workLineId },
    data: { assignedSubId: subId, workStatus: "assigned", assignedAt: new Date() },
  });
  await recomputeInvoiceStatus(wl.invoiceId);
}

export async function transitionWorkLineStatus(workLineId: string, status: string): Promise<string> {
  const data: Record<string, unknown> = { workStatus: status };

  if (status === "completed") data.completedAt = new Date();
  if (status === "approved") {
    data.approvalStatus = "approved";
    data.approvedAt = new Date();
    data.payEligible = true;
  }

  const wl = await prisma.workLine.update({ where: { id: workLineId }, data });
  await recomputeInvoiceStatus(wl.invoiceId);
  return wl.invoiceId;
}

export async function bulkMarkPaid(workLineIds: string[]): Promise<void> {
  await prisma.workLine.updateMany({
    where: { id: { in: workLineIds } },
    data: { workStatus: "paid" },
  });
  const wls = await prisma.workLine.findMany({
    where: { id: { in: workLineIds } },
    select: { invoiceId: true },
  });
  const invoiceIds = [...new Set(wls.map((w) => w.invoiceId))];
  await Promise.all(invoiceIds.map(recomputeInvoiceStatus));
}
