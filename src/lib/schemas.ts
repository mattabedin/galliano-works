import { z } from "zod";

// ---- Shared primitives ----
const id = z.string().min(1).max(255);
const nonEmptyStr = z.string().min(1).max(2000);
const optStr = z.string().max(2000).nullable().optional();
const money = z.number().finite().nonnegative();
const optMoney = z.number().finite().nonnegative().nullable().optional();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

// ---- Work line schemas ----
export const AssignWorkLineSchema = z.object({
  workLineId: id,
  subId: id,
});

export const UpdateWorkLineStatusSchema = z.object({
  workLineId: id,
  status: z.enum(["unassigned", "assigned", "in_progress", "completed", "submitted", "approved", "rejected", "paid"]),
});

export const UpdateWorkLineSchema = z.object({
  id,
  data: z.object({
    title: nonEmptyStr.optional(),
    description: optStr,
    adminNotes: optStr,
    dueDate: z.date().nullable().optional(),
    serviceAddress: optStr,
    payAmount: optMoney,
  }),
});

export const CreateWorkLinesSchema = z.array(
  z.object({
    lineItemId: id,
    title: nonEmptyStr,
    description: z.string().max(2000).optional(),
  })
).min(1);

export const MarkWorkLinesPaidSchema = z.array(id).min(1);

// ---- Invoice record schemas ----
export const UpdateInvoiceRecordSchema = z.object({
  id,
  data: z.object({
    invoiceNumber: nonEmptyStr.optional(),
    invoiceDate: dateStr.optional(),
    customerName: nonEmptyStr.optional(),
    customerEmail: z.string().email().nullable().optional(),
    customerPhone: optStr,
    customerAddress: optStr,
    serviceAddress: optStr,
    invoiceTotal: money.optional(),
  }),
});

export const CreateInvoiceLineItemSchema = z.object({
  invoiceId: id,
  data: z.object({
    description: nonEmptyStr,
    quantity: optMoney,
    unitPrice: optMoney,
    lineTotal: money,
    notes: optStr,
  }),
});

export const UpdateInvoiceLineItemSchema = z.object({
  id,
  data: z.object({
    description: nonEmptyStr.optional(),
    quantity: optMoney,
    unitPrice: optMoney,
    lineTotal: money.optional(),
    notes: optStr,
  }),
});

// ---- Import schema ----
export const SaveImportedInvoicesSchema = z.object({
  fileName: z.string().min(1).max(500),
  sourceType: z.enum(["csv", "freshbooks", "quickbooks"]).default("csv"),
});

// ---- Legacy action schemas ----
export const AssignLineItemSchema = z.object({
  lineId: id,
  subId: id,
});

export const UpdateLineStatusSchema = z.object({
  lineId: id,
  status: z.enum(["unassigned", "assigned", "in_progress", "submitted", "approved", "paid"]),
});

export const AddExpenseSchema = z.object({
  lineId: id,
  amount: money,
  category: nonEmptyStr,
  note: optStr,
});
