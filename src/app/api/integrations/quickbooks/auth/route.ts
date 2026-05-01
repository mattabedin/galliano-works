import { NextResponse } from "next/server";
import { buildQuickBooksAuthUrl, QUICKBOOKS_CONFIG } from "@/lib/quickbooks-client";
import { randomBytes } from "crypto";

export async function GET() {
  if (!QUICKBOOKS_CONFIG.isConfigured) {
    return NextResponse.json(
      { error: "QuickBooks integration not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET in your environment." },
      { status: 503 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildQuickBooksAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
