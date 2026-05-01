import { NextRequest, NextResponse } from "next/server";
import { fetchQuickBooksInvoices, refreshQuickBooksToken } from "@/lib/quickbooks-client";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const integration = await prisma.integration.findUnique({ where: { provider: "quickbooks" } });
  if (!integration) {
    return NextResponse.json({ error: "QuickBooks not connected" }, { status: 401 });
  }

  let accessToken = integration.accessToken;

  // Refresh token if expired
  if (integration.expiresAt && new Date() > integration.expiresAt && integration.refreshToken) {
    try {
      const refreshed = await refreshQuickBooksToken(integration.refreshToken);
      accessToken = refreshed.access_token;
      await prisma.integration.update({
        where: { provider: "quickbooks" },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    } catch {
      return NextResponse.json({ error: "QuickBooks token expired. Please reconnect." }, { status: 401 });
    }
  }

  try {
    const result = await fetchQuickBooksInvoices(accessToken, integration.accountId || "", {
      dateFrom,
      dateTo,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch invoices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
