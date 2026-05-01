export type InvoiceStatus =
  | "imported"
  | "reviewed"
  | "work_lines_created"
  | "in_progress"
  | "completed"
  | "closed";

export type WorkStatus =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "completed"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid";

export type ApprovalStatus =
  | "not_submitted"
  | "submitted"
  | "approved"
  | "rejected";

export type SourceType = "csv" | "freshbooks" | "quickbooks" | "manual" | "api";

export interface InvoiceLineItemData {
  id: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number;
  notes: string | null;
  isWorkRelated: boolean;
  workLines: WorkLineData[];
}

export interface WorkLineData {
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
  workStatus: WorkStatus;
  approvalStatus: ApprovalStatus;
  completionNotes: string | null;
  adminNotes: string | null;
  completedAt: Date | null;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  payEligible: boolean;
  payAmount: number | null;
  paySummaryId: string | null;
  assignedSub: { id: string; name: string; color: string; initials: string } | null;
}

export interface InvoiceRecordData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  serviceAddress: string | null;
  invoiceTotal: number;
  sourceType: SourceType;
  externalInvoiceId: string | null;
  invoiceStatus: InvoiceStatus;
  importedByUserId: string | null;
  importBatchId: string | null;
  createdAt: Date;
  lineItems: InvoiceLineItemData[];
  workLineCount: number;
}

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; bg: string; fg: string; dot: string }> = {
  imported:           { label: "Imported",           bg: "#f4f4f2", fg: "#787570", dot: "#b8b5ae" },
  reviewed:           { label: "Reviewed",           bg: "#eef2f7", fg: "#3b5378", dot: "#6b8cbf" },
  work_lines_created: { label: "Work Lines Created", bg: "#fef4e6", fg: "#8a5a1a", dot: "#d89538" },
  in_progress:        { label: "In Progress",        bg: "#f0ebf7", fg: "#5c3d8a", dot: "#7b5ea7" },
  completed:          { label: "Completed",          bg: "#e8f1ec", fg: "#2f6848", dot: "#4a8a6e" },
  closed:             { label: "Closed",             bg: "#e6f0f2", fg: "#1f5a66", dot: "#3d7a8a" },
};

export const WORK_STATUS_META: Record<WorkStatus, { label: string; bg: string; fg: string; dot: string }> = {
  unassigned:  { label: "Unassigned",  bg: "#f4f4f2", fg: "#787570", dot: "#b8b5ae" },
  assigned:    { label: "Assigned",    bg: "#eef2f7", fg: "#3b5378", dot: "#6b8cbf" },
  in_progress: { label: "In Progress", bg: "#fef4e6", fg: "#8a5a1a", dot: "#d89538" },
  completed:   { label: "Completed",   bg: "#e8f1ec", fg: "#2f6848", dot: "#4a8a6e" },
  submitted:   { label: "Submitted",   bg: "#f0ebf7", fg: "#5c3d8a", dot: "#7b5ea7" },
  approved:    { label: "Approved",    bg: "#e8f1ec", fg: "#2f6848", dot: "#4a8a6e" },
  rejected:    { label: "Rejected",    bg: "#fbeee9", fg: "#a8442f", dot: "#d07060" },
  paid:        { label: "Paid",        bg: "#e6f0f2", fg: "#1f5a66", dot: "#3d7a8a" },
};

export const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; bg: string; fg: string }> = {
  not_submitted: { label: "Not Submitted", bg: "#f4f4f2", fg: "#787570" },
  submitted:     { label: "Submitted",     bg: "#f0ebf7", fg: "#5c3d8a" },
  approved:      { label: "Approved",      bg: "#e8f1ec", fg: "#2f6848" },
  rejected:      { label: "Rejected",      bg: "#fbeee9", fg: "#a8442f" },
};

export const SYSTEM_FIELDS: { key: string; label: string; required: boolean; description: string }[] = [
  { key: "invoiceNumber",   label: "Invoice Number",              required: true,  description: "Unique invoice identifier" },
  { key: "invoiceDate",     label: "Invoice Date",                required: true,  description: "Date the invoice was issued" },
  { key: "customerName",    label: "Customer Name",               required: true,  description: "Name of the client or customer" },
  { key: "customerEmail",   label: "Customer Email",              required: false, description: "Customer email address" },
  { key: "customerPhone",   label: "Customer Phone",              required: false, description: "Customer phone number" },
  { key: "customerAddress", label: "Customer Address",            required: false, description: "Customer billing address" },
  { key: "serviceAddress",  label: "Service Address / Job Site",  required: false, description: "Location where work is performed" },
  { key: "lineDescription", label: "Line Item Description",       required: true,  description: "Description of the service or item" },
  { key: "quantity",        label: "Quantity",                    required: false, description: "Number of units" },
  { key: "unitPrice",       label: "Unit Price",                  required: false, description: "Price per unit" },
  { key: "lineTotal",       label: "Line Total",                  required: true,  description: "Total amount for this line item" },
  { key: "notes",           label: "Notes",                       required: false, description: "Additional line item notes" },
  { key: "invoiceTotal",    label: "Invoice Total",               required: false, description: "Total invoice amount" },
];

export interface ParsedCSVResult {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface FieldMapping {
  [systemField: string]: string;
}

export interface ParsedInvoiceLine {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number;
  notes: string | null;
  rowNumber: number;
}

export interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  serviceAddress: string;
  invoiceTotal: number;
  lineItems: ParsedInvoiceLine[];
  rowNumbers: number[];
}

export interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value: string;
}

export interface DuplicateWarning {
  invoiceNumber: string;
  existingId: string;
  customerName: string;
  invoiceDate: string;
}

export interface ImportReview {
  invoices: ParsedInvoice[];
  errors: ValidationError[];
  duplicates: DuplicateWarning[];
  totalInvoices: number;
  totalLineItems: number;
}
