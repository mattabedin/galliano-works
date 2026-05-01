"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  InvoiceRecordData,
  InvoiceLineItemData,
  WorkLineData,
  ParsedInvoice,
  DuplicateWarning,
  InvoiceStatus,
} from "@/lib/invoice-types";

export async function getInvoiceList(): Promise<InvoiceRecordData[]> {
  const records = await prisma.invoiceRecord.findMany({
    include: {
      lineItems: {
        include: { workLines: { include: { assignedSub: true } } },
        orderBy: { lineNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return records.map(mapInvoiceRecord);
}

export async function getInvoiceDetail(id: string): Promise<InvoiceRecordData | null> {
  const record = await prisma.invoiceRecord.findUnique({
    where: { id },
    include: {
      lineItems: {
        include: { workLines: { include: { assignedSub: true } } },
        orderBy: { lineNumber: "asc" },
      },
    },
  });
  if (!record) return null;
  return mapInvoiceRecord(record);
}

function mapInvoiceRecord(record: {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  serviceAddress: string | null;
  invoiceTotal: number;
  sourceType: string;
  externalInvoiceId: string | null;
  invoiceStatus: string;
  importedByUserId: string | null;
  importBatchId: string | null;
  createdAt: Date;
  lineItems: {
    id: string;
    invoiceId: string;
    lineNumber: number;
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    lineTotal: number;
    notes: string | null;
    isWorkRelated: boolean;
    workLines: {
      id: string;
      invoiceId: string;
      invoiceLineItemId: string;
      title: string;
      description: string | null;
      customerName: string;
      serviceAddress: string | null;
      invoiceLineAmount: number;
      assignedSubId: string | null;
      assignedAt: Date | null;
      dueDate: Date | null;
      workStatus: string;
      approvalStatus: string;
      completionNotes: string | null;
      adminNotes: string | null;
      completedAt: Date | null;
      approvedAt: Date | null;
      approvedByUserId: string | null;
      payEligible: boolean;
      payAmount: number | null;
      paySummaryId: string | null;
      assignedSub: { id: string; name: string; color: string; initials: string } | null;
    }[];
  }[];
}): InvoiceRecordData {
  const workLineCount = record.lineItems.reduce((s, li) => s + li.workLines.length, 0);
  return {
    id: record.id,
    invoiceNumber: record.invoiceNumber,
    invoiceDate: record.invoiceDate,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    customerPhone: record.customerPhone,
    customerAddress: record.customerAddress,
    serviceAddress: record.serviceAddress,
    invoiceTotal: record.invoiceTotal,
    sourceType: record.sourceType as InvoiceRecordData["sourceType"],
    externalInvoiceId: record.externalInvoiceId,
    invoiceStatus: record.invoiceStatus as InvoiceRecordData["invoiceStatus"],
    importedByUserId: record.importedByUserId,
    importBatchId: record.importBatchId,
    createdAt: record.createdAt,
    workLineCount,
    lineItems: record.lineItems.map((li): InvoiceLineItemData => ({
      id: li.id,
      invoiceId: li.invoiceId,
      lineNumber: li.lineNumber,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      lineTotal: li.lineTotal,
      notes: li.notes,
      isWorkRelated: li.isWorkRelated,
      workLines: li.workLines.map((wl): WorkLineData => ({
        id: wl.id,
        invoiceId: wl.invoiceId,
        invoiceLineItemId: wl.invoiceLineItemId,
        title: wl.title,
        description: wl.description,
        customerName: wl.customerName,
        serviceAddress: wl.serviceAddress,
        invoiceLineAmount: wl.invoiceLineAmount,
        assignedSubId: wl.assignedSubId,
        assignedAt: wl.assignedAt,
        dueDate: wl.dueDate,
        workStatus: wl.workStatus as WorkLineData["workStatus"],
        approvalStatus: wl.approvalStatus as WorkLineData["approvalStatus"],
        completionNotes: wl.completionNotes,
        adminNotes: wl.adminNotes,
        completedAt: wl.completedAt,
        approvedAt: wl.approvedAt,
        approvedByUserId: wl.approvedByUserId,
        payEligible: wl.payEligible,
        payAmount: wl.payAmount,
        paySummaryId: wl.paySummaryId,
        assignedSub: wl.assignedSub,
      })),
    })),
  };
}

export async function checkDuplicates(
  invoices: { invoiceNumber: string; customerName: string; invoiceDate: string }[]
): Promise<DuplicateWarning[]> {
  const numbers = invoices.map((i) => i.invoiceNumber);
  const existing = await prisma.invoiceRecord.findMany({
    where: { invoiceNumber: { in: numbers } },
    select: { id: true, invoiceNumber: true, customerName: true, invoiceDate: true },
  });

  const existingMap = new Map(existing.map((e) => [e.invoiceNumber, e]));

  return invoices
    .filter((inv) => existingMap.has(inv.invoiceNumber))
    .map((inv) => {
      const ex = existingMap.get(inv.invoiceNumber)!;
      return {
        invoiceNumber: inv.invoiceNumber,
        existingId: ex.id,
        customerName: ex.customerName,
        invoiceDate: ex.invoiceDate,
      };
    });
}

export async function saveImportedInvoices(
  invoices: ParsedInvoice[],
  fileName: string,
  sourceType: string = "csv"
): Promise<{ success: boolean; batchId: string; invoiceCount: number; lineItemCount: number }> {
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

  for (const inv of invoices) {
    await prisma.invoiceRecord.create({
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
    });
  }

  revalidatePath("/");
  return { success: true, batchId: batch.id, invoiceCount: invoices.length, lineItemCount: totalLineItems };
}

export async function createWorkLines(
  items: { lineItemId: string; title: string; description?: string }[]
): Promise<{ success: boolean; count: number }> {
  if (items.length === 0) return { success: true, count: 0 };

  const lineItems = await prisma.invoiceLineItem.findMany({
    where: { id: { in: items.map((i) => i.lineItemId) } },
    include: { invoice: true },
  });

  const lineItemMap = new Map(lineItems.map((li) => [li.id, li]));

  await prisma.workLine.createMany({
    data: items.map((item) => {
      const li = lineItemMap.get(item.lineItemId)!;
      return {
        invoiceId: li.invoiceId,
        invoiceLineItemId: li.id,
        title: item.title,
        description: item.description || null,
        customerName: li.invoice.customerName,
        serviceAddress: li.invoice.serviceAddress,
        invoiceLineAmount: li.lineTotal,
        workStatus: "unassigned",
        approvalStatus: "not_submitted",
        payEligible: false,
      };
    }),
  });

  const invoiceIds = [...new Set(lineItems.map((li) => li.invoiceId))];
  for (const invoiceId of invoiceIds) {
    await updateInvoiceStatus(invoiceId);
  }

  revalidatePath("/");
  return { success: true, count: items.length };
}

export async function updateLineItemWorkRelated(
  lineItemId: string,
  isWorkRelated: boolean
): Promise<void> {
  await prisma.invoiceLineItem.update({
    where: { id: lineItemId },
    data: { isWorkRelated },
  });
  revalidatePath("/");
}

export async function updateInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoiceRecord.findUnique({
    where: { id: invoiceId },
    include: { lineItems: { include: { workLines: true } } },
  });
  if (!invoice) return;

  const allWorkLines = invoice.lineItems.flatMap((li) => li.workLines);
  const hasWorkLines = allWorkLines.length > 0;
  const allCompleted = hasWorkLines && allWorkLines.every((wl) => wl.workStatus === "completed" || wl.workStatus === "approved" || wl.workStatus === "paid");
  const anyInProgress = allWorkLines.some((wl) => wl.workStatus === "in_progress" || wl.workStatus === "assigned");

  let status: InvoiceStatus = invoice.invoiceStatus as InvoiceStatus;
  if (!hasWorkLines && status === "imported") status = "imported";
  else if (hasWorkLines && (status === "imported" || status === "reviewed")) status = "work_lines_created";
  else if (anyInProgress) status = "in_progress";
  else if (allCompleted) status = "completed";

  await prisma.invoiceRecord.update({
    where: { id: invoiceId },
    data: { invoiceStatus: status },
  });
}

export async function markInvoiceReviewed(invoiceId: string): Promise<void> {
  await prisma.invoiceRecord.update({
    where: { id: invoiceId },
    data: { invoiceStatus: "reviewed" },
  });
  revalidatePath("/");
}

export async function closeInvoice(invoiceId: string): Promise<void> {
  await prisma.invoiceRecord.update({
    where: { id: invoiceId },
    data: { invoiceStatus: "closed" },
  });
  revalidatePath("/");
}

export async function assignWorkLine(workLineId: string, subId: string): Promise<void> {
  await prisma.workLine.update({
    where: { id: workLineId },
    data: {
      assignedSubId: subId,
      workStatus: "assigned",
      assignedAt: new Date(),
    },
  });
  revalidatePath("/");
}

export async function updateWorkLineStatus(workLineId: string, status: string): Promise<void> {
  const data: Record<string, unknown> = { workStatus: status };
  if (status === "completed") data.completedAt = new Date();
  if (status === "approved") {
    data.approvalStatus = "approved";
    data.approvedAt = new Date();
    data.payEligible = true;
  }

  const wl = await prisma.workLine.update({ where: { id: workLineId }, data });
  await updateInvoiceStatus(wl.invoiceId);
  revalidatePath("/");
}

export async function updateInvoiceRecord(
  id: string,
  data: {
    invoiceNumber?: string;
    invoiceDate?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    serviceAddress?: string;
    invoiceTotal?: number;
  }
): Promise<void> {
  await prisma.invoiceRecord.update({ where: { id }, data });
  revalidatePath("/");
}

export async function updateInvoiceLineItem(
  id: string,
  data: {
    description?: string;
    quantity?: number | null;
    unitPrice?: number | null;
    lineTotal?: number;
    notes?: string | null;
  }
): Promise<void> {
  await prisma.invoiceLineItem.update({ where: { id }, data });
  revalidatePath("/");
}

export async function deleteInvoiceLineItem(id: string): Promise<{ success: boolean; error?: string }> {
  const li = await prisma.invoiceLineItem.findUnique({
    where: { id },
    include: { workLines: { select: { id: true } } },
  });
  if (!li) return { success: false, error: "Line item not found" };
  if (li.workLines.length > 0) {
    return { success: false, error: "Cannot delete a line item that has work lines. Remove the work lines first." };
  }
  await prisma.invoiceLineItem.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}

export async function createInvoiceLineItem(
  invoiceId: string,
  data: {
    description: string;
    quantity?: number | null;
    unitPrice?: number | null;
    lineTotal: number;
    notes?: string | null;
  }
): Promise<void> {
  const last = await prisma.invoiceLineItem.findFirst({
    where: { invoiceId },
    orderBy: { lineNumber: "desc" },
    select: { lineNumber: true },
  });
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId,
      lineNumber: (last?.lineNumber ?? 0) + 1,
      description: data.description,
      quantity: data.quantity ?? null,
      unitPrice: data.unitPrice ?? null,
      lineTotal: data.lineTotal,
      notes: data.notes ?? null,
      isWorkRelated: true,
    },
  });
  revalidatePath("/");
}

export async function markWorkLinesPaid(workLineIds: string[]): Promise<void> {
  if (workLineIds.length === 0) return;
  await prisma.workLine.updateMany({
    where: { id: { in: workLineIds } },
    data: { workStatus: "paid" },
  });
  const wls = await prisma.workLine.findMany({ where: { id: { in: workLineIds } }, select: { invoiceId: true } });
  const invoiceIds = [...new Set(wls.map((w) => w.invoiceId))];
  for (const invoiceId of invoiceIds) await updateInvoiceStatus(invoiceId);
  revalidatePath("/");
}

export async function getBadgeCounts(): Promise<{ board: number; approvals: number }> {
  const [board, approvals] = await Promise.all([
    prisma.workLine.count({ where: { workStatus: "unassigned" } }),
    prisma.workLine.count({ where: { workStatus: "submitted" } }),
  ]);
  return { board, approvals };
}

export async function updateWorkLine(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    adminNotes?: string | null;
    dueDate?: Date | null;
    serviceAddress?: string | null;
    payAmount?: number | null;
  }
): Promise<void> {
  await prisma.workLine.update({ where: { id }, data });
  revalidatePath("/");
}
