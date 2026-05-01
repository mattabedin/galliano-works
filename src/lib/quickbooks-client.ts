import { ParsedInvoice } from "./invoice-types";

const QB_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_API_BASE = "https://quickbooks.api.intuit.com/v3/company";

export const QUICKBOOKS_CONFIG = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/quickbooks/callback`,
  isConfigured: !!(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
};

export function buildQuickBooksAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: QUICKBOOKS_CONFIG.clientId,
    redirect_uri: QUICKBOOKS_CONFIG.redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });
  return `${QB_AUTH_BASE}?${params}`;
}

async function qbTokenRequest(body: Record<string, string>): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}> {
  const credentials = Buffer.from(
    `${QUICKBOOKS_CONFIG.clientId}:${QUICKBOOKS_CONFIG.clientSecret}`
  ).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QuickBooks token request failed: ${err}`);
  }
  return res.json();
}

export async function exchangeQuickBooksCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  return qbTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: QUICKBOOKS_CONFIG.redirectUri,
  });
}

export async function refreshQuickBooksToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  return qbTokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

interface QBLine {
  DetailType?: string;
  Amount?: number;
  Description?: string;
  SalesItemLineDetail?: {
    Qty?: number;
    UnitPrice?: number;
    ItemRef?: { name?: string };
  };
}

interface QBInvoice {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  TotalAmt?: number;
  CustomerRef?: { name?: string };
  BillEmail?: { Address?: string };
  BillAddr?: { Line1?: string; City?: string; CountrySubDivisionCode?: string };
  ShipAddr?: { Line1?: string; City?: string; CountrySubDivisionCode?: string };
  Line?: QBLine[];
}

function formatQBAddress(addr?: QBInvoice["BillAddr"]): string {
  if (!addr) return "";
  return [addr.Line1, addr.City, addr.CountrySubDivisionCode].filter(Boolean).join(", ");
}

export async function fetchQuickBooksInvoices(
  accessToken: string,
  realmId: string,
  options: { dateFrom?: string; dateTo?: string } = {}
): Promise<{ invoices: ParsedInvoice[]; total: number }> {
  let query = "SELECT * FROM Invoice";
  const conditions: string[] = [];
  if (options.dateFrom) conditions.push(`TxnDate >= '${options.dateFrom}'`);
  if (options.dateTo) conditions.push(`TxnDate <= '${options.dateTo}'`);
  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
  query += " MAXRESULTS 200";

  const res = await fetch(
    `${QB_API_BASE}/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QuickBooks API error: ${err}`);
  }

  const data = await res.json();
  const qbInvoices: QBInvoice[] = data.QueryResponse?.Invoice || [];

  const invoices: ParsedInvoice[] = qbInvoices.map((qb, idx) => {
    const salesLines = (qb.Line || []).filter(
      (l) => l.DetailType === "SalesItemLineDetail"
    );
    return {
      invoiceNumber: qb.DocNumber || qb.Id || `QB-${idx + 1}`,
      invoiceDate: qb.TxnDate || "",
      customerName: qb.CustomerRef?.name || "",
      customerEmail: qb.BillEmail?.Address || "",
      customerPhone: "",
      customerAddress: formatQBAddress(qb.BillAddr),
      serviceAddress: formatQBAddress(qb.ShipAddr),
      invoiceTotal: qb.TotalAmt || 0,
      lineItems: salesLines.map((line, li) => ({
        description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || "Service",
        quantity: line.SalesItemLineDetail?.Qty ?? null,
        unitPrice: line.SalesItemLineDetail?.UnitPrice ?? null,
        lineTotal: line.Amount || 0,
        notes: null,
        rowNumber: li + 1,
      })),
      rowNumbers: [idx + 1],
    };
  });

  return { invoices, total: qbInvoices.length };
}
