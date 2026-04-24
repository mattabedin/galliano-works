export type Status =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "approved"
  | "paid";

export interface Sub {
  id: string;
  name: string;
  trade: string;
  rate: number;
  color: string;
  initials: string;
}

export interface LineItem {
  id: string;
  desc: string;
  invoice: number;
  laborPct: number;
  expenses: number;
  status: Status;
  note: string | null;
  invoiceId: string;
  subId: string | null;
  sub: Sub | null;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  address: string;
  issued: string;
  due: string;
  source: string;
  lines: LineItem[];
}

export interface PayHistory {
  id: string;
  week: string;
  amount: number;
  items: number;
  subId: string;
}

export const STATUS_META: Record<
  Status,
  { label: string; bg: string; fg: string; dot: string }
> = {
  unassigned:  { label: "Unassigned",  bg: "#f4f4f2", fg: "#787570", dot: "#b8b5ae" },
  assigned:    { label: "Assigned",    bg: "#eef2f7", fg: "#3b5378", dot: "#6b8cbf" },
  in_progress: { label: "In progress", bg: "#fef4e6", fg: "#8a5a1a", dot: "#d89538" },
  submitted:   { label: "Submitted",   bg: "#f0ebf7", fg: "#5c3d8a", dot: "#7b5ea7" },
  approved:    { label: "Approved",    bg: "#e8f1ec", fg: "#2f6848", dot: "#4a8a6e" },
  paid:        { label: "Paid",        bg: "#e6f0f2", fg: "#1f5a66", dot: "#3d7a8a" },
};

export function lineLabor(line: { invoice: number; laborPct: number }): number {
  return Math.round(line.invoice * line.laborPct);
}

export function lineProfit(line: {
  invoice: number;
  laborPct: number;
  expenses: number;
}): number {
  return line.invoice - lineLabor(line) - (line.expenses || 0);
}

export function invoiceTotals(inv: Invoice) {
  const invoice = inv.lines.reduce((s, l) => s + l.invoice, 0);
  const labor = inv.lines.reduce((s, l) => s + lineLabor(l), 0);
  const expenses = inv.lines.reduce((s, l) => s + (l.expenses || 0), 0);
  const profit = invoice - labor - expenses;
  return { invoice, labor, expenses, profit, margin: invoice ? profit / invoice : 0 };
}

export function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}
