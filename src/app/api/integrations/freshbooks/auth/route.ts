import { NextResponse } from "next/server";
import { buildFreshBooksAuthUrl, FRESHBOOKS_CONFIG } from "@/lib/freshbooks-client";
import { randomBytes } from "crypto";

export async function GET() {
  if (!FRESHBOOKS_CONFIG.isConfigured) {
    return NextResponse.json(
      { error: "FreshBooks integration not configured. Set FRESHBOOKS_CLIENT_ID and FRESHBOOKS_CLIENT_SECRET in your environment." },
      { status: 503 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildFreshBooksAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
