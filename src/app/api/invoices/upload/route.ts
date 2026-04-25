import { NextResponse } from "next/server";
import { ParsedCSVResult, ValidationError, ParsedInvoice, SYSTEM_FIELDS, FieldMapping } from "@/lib/invoice-types";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): ParsedCSVResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { columns: [], rows: [], totalRows: 0 };

  const columns = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return columns.reduce(
      (obj, col, i) => { obj[col] = (values[i] || "").trim(); return obj; },
      {} as Record<string, string>
    );
  });
  return { columns, rows, totalRows: rows.length };
}

function parseCurrency(val: string): number {
  const cleaned = val.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: string): string {
  if (!val) return "";
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const mmddyyyy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) return `${mmddyyyy[3]}-${mmddyyyy[1].padStart(2, "0")}-${mmddyyyy[2].padStart(2, "0")}`;
  return val;
}

function applyMappings(rows: Record<string, string>[], mappings: FieldMapping): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [systemField, csvColumn] of Object.entries(mappings)) {
      mapped[systemField] = csvColumn ? (row[csvColumn] || "") : "";
    }
    return mapped;
  });
}

function validateAndGroup(
  mappedRows: Record<string, string>[]
): { invoices: ParsedInvoice[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const invoiceMap = new Map<string, ParsedInvoice>();

  for (let i = 0; i < mappedRows.length; i++) {
    const row = mappedRows[i];
    const rowNum = i + 2;
    const rowErrors: string[] = [];

    const invoiceNumber = row.invoiceNumber?.trim();
    const customerName = row.customerName?.trim();
    const invoiceDate = parseDate(row.invoiceDate?.trim() || "");
    const lineDescription = row.lineDescription?.trim();
    const lineTotalRaw = row.lineTotal?.trim();

    if (!invoiceNumber) { errors.push({ rowNumber: rowNum, field: "invoiceNumber", message: "Missing invoice number", value: "" }); rowErrors.push("invoiceNumber"); }
    if (!customerName) { errors.push({ rowNumber: rowNum, field: "customerName", message: "Missing customer name", value: "" }); rowErrors.push("customerName"); }
    if (!invoiceDate) { errors.push({ rowNumber: rowNum, field: "invoiceDate", message: "Missing or invalid invoice date", value: row.invoiceDate || "" }); rowErrors.push("invoiceDate"); }
    if (!lineDescription) { errors.push({ rowNumber: rowNum, field: "lineDescription", message: "Missing line item description", value: "" }); rowErrors.push("lineDescription"); }
    if (!lineTotalRaw) { errors.push({ rowNumber: rowNum, field: "lineTotal", message: "Missing line total", value: "" }); rowErrors.push("lineTotal"); }

    const lineTotal = parseCurrency(lineTotalRaw || "0");
    if (lineTotalRaw && isNaN(lineTotal)) {
      errors.push({ rowNumber: rowNum, field: "lineTotal", message: `Invalid amount: "${lineTotalRaw}"`, value: lineTotalRaw }); rowErrors.push("lineTotal");
    }

    if (rowErrors.some((f) => ["invoiceNumber", "customerName"].includes(f))) continue;

    const key = invoiceNumber;
    if (!invoiceMap.has(key)) {
      invoiceMap.set(key, {
        invoiceNumber,
        invoiceDate,
        customerName,
        customerEmail: row.customerEmail?.trim() || "",
        customerPhone: row.customerPhone?.trim() || "",
        customerAddress: row.customerAddress?.trim() || "",
        serviceAddress: row.serviceAddress?.trim() || "",
        invoiceTotal: parseCurrency(row.invoiceTotal?.trim() || "0"),
        lineItems: [],
        rowNumbers: [],
      });
    }

    const inv = invoiceMap.get(key)!;
    inv.rowNumbers.push(rowNum);

    if (!rowErrors.includes("lineDescription") && !rowErrors.includes("lineTotal")) {
      const qty = row.quantity?.trim() ? parseFloat(row.quantity.trim()) : null;
      const up = row.unitPrice?.trim() ? parseCurrency(row.unitPrice.trim()) : null;
      inv.lineItems.push({
        description: lineDescription,
        quantity: qty,
        unitPrice: up,
        lineTotal,
        notes: row.notes?.trim() || null,
        rowNumber: rowNum,
      });
    }
  }

  const invoices = Array.from(invoiceMap.values()).map((inv) => ({
    ...inv,
    invoiceTotal: inv.invoiceTotal || inv.lineItems.reduce((s, l) => s + l.lineTotal, 0),
  }));

  return { invoices, errors };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingsRaw = formData.get("mappings") as string | null;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "File must be a CSV (.csv)" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.columns.length === 0) {
      return NextResponse.json({ error: "CSV file appears to be empty or unreadable" }, { status: 400 });
    }

    if (!mappingsRaw) {
      return NextResponse.json({
        step: "map",
        columns: parsed.columns,
        preview: parsed.rows.slice(0, 5),
        totalRows: parsed.totalRows,
        fileName: file.name,
      });
    }

    const mappings: FieldMapping = JSON.parse(mappingsRaw);
    const requiredFields = SYSTEM_FIELDS.filter((f) => f.required).map((f) => f.key);
    const missingRequired = requiredFields.filter((f) => !mappings[f]);
    if (missingRequired.length > 0) {
      return NextResponse.json({
        error: `Missing required field mappings: ${missingRequired.join(", ")}`,
      }, { status: 400 });
    }

    const mappedRows = applyMappings(parsed.rows, mappings);
    const { invoices, errors } = validateAndGroup(mappedRows);

    return NextResponse.json({
      step: "review",
      invoices,
      errors,
      totalInvoices: invoices.length,
      totalLineItems: invoices.reduce((s, inv) => s + inv.lineItems.length, 0),
      fileName: file.name,
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 });
  }
}
