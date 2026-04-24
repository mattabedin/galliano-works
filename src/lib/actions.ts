"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAppData() {
  const [subs, invoices, payHistory] = await Promise.all([
    prisma.subcontractor.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.findMany({
      include: { lines: { include: { sub: true } } },
      orderBy: { number: "asc" },
    }),
    prisma.payHistory.findMany({ orderBy: { subId: "asc" } }),
  ]);
  return { subs, invoices, payHistory };
}

export async function assignLineItem(lineId: string, subId: string) {
  await prisma.lineItem.update({
    where: { id: lineId },
    data: { subId, status: "assigned" },
  });
  revalidatePath("/");
}

export async function approveLineItem(lineId: string) {
  await prisma.lineItem.update({
    where: { id: lineId },
    data: { status: "approved" },
  });
  revalidatePath("/");
}

export async function rejectLineItem(lineId: string) {
  await prisma.lineItem.update({
    where: { id: lineId },
    data: { status: "in_progress" },
  });
  revalidatePath("/");
}

export async function approveAllSubmitted() {
  await prisma.lineItem.updateMany({
    where: { status: "submitted" },
    data: { status: "approved" },
  });
  revalidatePath("/");
}

export async function runPayroll() {
  const approved = await prisma.lineItem.findMany({
    where: { status: "approved" },
    include: { sub: true },
  });

  if (approved.length === 0) return { success: false, message: "No approved items" };

  const run = await prisma.payrollRun.create({
    data: {
      week: "Apr 20–26, 2026",
      items: {
        create: approved.map((l) => ({
          lineItemId: l.id,
          subId: l.subId!,
          amount: Math.round(l.invoice * l.laborPct),
        })),
      },
    },
  });

  await prisma.lineItem.updateMany({
    where: { status: "approved" },
    data: { status: "paid" },
  });

  revalidatePath("/");
  return { success: true, runId: run.id, count: approved.length };
}

export async function addExpense(lineId: string, amount: number) {
  const line = await prisma.lineItem.findUniqueOrThrow({ where: { id: lineId } });
  await prisma.lineItem.update({
    where: { id: lineId },
    data: { expenses: (line.expenses || 0) + amount },
  });
  revalidatePath("/");
}

export async function updateLineStatus(lineId: string, status: string) {
  await prisma.lineItem.update({
    where: { id: lineId },
    data: { status },
  });
  revalidatePath("/");
}
