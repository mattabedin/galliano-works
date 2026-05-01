import { ParsedInvoice } from "./invoice-types";

const FB_AUTH_BASE = "https://auth.freshbooks.com";
const FB_API_BASE = "https://api.freshbooks.com";

export const FRESHBOOKS_CONFIG = {
  clientId: process.env.FRESHBOOKS_CLIENT_ID || "",
  clientSecret: process.env.FRESHBOOKS_CLIENT_SECRET || "",
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/freshbooks/callback`,
  isConfigured: !!(process.env.FRESHBOOKS_CLIENT_ID && process.env.FRESHBOOKS_CLIENT_SECRET),
};

export function buildFreshBooksAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: FRESHBOOKS_CONFIG.clientId,
    redirect_uri: FRESHBOOKS_CONFIG.redirectUri,
    response_type: "code",
    scope: "user:profile:read user:billing_info:read",
    state,
  });
  return `${FB_AUTH_BASE}/oauth/authorize?${params}`;
}

export async function exchangeFreshBooksCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${FB_API_BASE}/auth/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: FRESHBOOKS_CONFIG.clientId,
      client_secret: FRESHBOOKS_CONFIG.clientSecret,
      redirect_uri: FRESHBOOKS_CONFIG.redirectUri,
      code,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FreshBooks token exchange failed: ${err}`);
  }
  return res.json();
}

export async function refreshFreshBooksToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${FB_API_BASE}/auth/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: FRESHBOOKS_CONFIG.clientId,
      client_secret: FRESHBOOKS_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error("FreshBooks token refresh failed");
  return res.json();
}

export async function getFreshBooksBusinessId(accessToken: string): Promise<{
  businessId: string;
  displayName: string;
}> {
  const res = await fetch(`${FB_API_BASE}/auth/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch FreshBooks user profile");
  const data = await res.json();
  const membership = data.response?.business_memberships?.[0];
  return {
    businessId: String(membership?.business?.account_id || ""),
    displayName: membership?.business?.name || data.response?.email || "FreshBooks Account",
  };
}

interface FBInvoiceLine {
  name?: string;
  description?: string;
  qty?: string;
  unit_cost?: { amount: string };
  amount?: { amount: string };
}

interface FBInvoice {
  invoice_number?: string;
  date?: string;
  organization?: string;
  email?: string;
  due_date?: string;
  amount?: { amount: string };
  billing_code?: string;
  lines?: FBInvoiceLine[];
}

export async function fetchFreshBooksInvoices(
  accessToken: string,
  businessId: string,
  options: { dateFrom?: string; dateTo?: string; page?: number } = {}
): Promise<{ invoices: ParsedInvoice[]; hasMore: boolean; total: number }> {
  const params = new URLSearchParams({ per_page: "100", page: String(options.page || 1) });
  if (options.dateFrom) params.set("search[date_min]", options.dateFrom);
  if (options.dateTo) params.set("search[date_max]", options.dateTo);

  const res = await fetch(
    `${FB_API_BASE}/accounting/account/${businessId}/invoices/invoices?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}`, "Api-Version": "alpha" } }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FreshBooks API error: ${err}`);
  }
  const data = await res.json();
  const fbInvoices: FBInvoice[] = data.response?.result?.invoices || [];
  const total: number = data.response?.result?.total || fbInvoices.length;
  const pages: number = data.response?.result?.pages || 1;

  const invoices: ParsedInvoice[] = fbInvoices.map((fb, idx) => ({
    invoiceNumber: fb.invoice_number || `FB-${idx + 1}`,
    invoiceDate: fb.date || "",
    customerName: fb.organization || "",
    customerEmail: fb.email || "",
    customerPhone: "",
    customerAddress: "",
    serviceAddress: "",
    invoiceTotal: parseFloat(fb.amount?.amount || "0") || 0,
    lineItems: (fb.lines || []).map((line, li) => ({
      description: line.name || line.description || "Service",
      quantity: line.qty ? parseFloat(line.qty) : null,
      unitPrice: line.unit_cost?.amount ? parseFloat(line.unit_cost.amount) : null,
      lineTotal: line.amount?.amount ? parseFloat(line.amount.amount) : 0,
      notes: null,
      rowNumber: li + 1,
    })),
    rowNumbers: [idx + 1],
  }));

  return { invoices, hasMore: (options.page || 1) < pages, total };
}
