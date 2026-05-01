import { NextRequest, NextResponse } from "next/server";
import { exchangeQuickBooksCode } from "@/lib/quickbooks-client";
import { prisma } from "@/lib/db";

const CLOSE_POPUP_HTML = (success: boolean, message: string) => `<!DOCTYPE html>
<html>
<head><title>QuickBooks</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage(${JSON.stringify({ type: "oauth-result", provider: "quickbooks", success, message })}, "*");
    window.close();
  } else {
    document.body.innerHTML = ${JSON.stringify(success ? "<p>Connected! You can close this tab.</p>" : `<p>Error: ${message}</p>`)};
  }
</script>
</body>
</html>`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  if (error || !code || !realmId) {
    return new NextResponse(CLOSE_POPUP_HTML(false, error || "Authorization cancelled"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const tokens = await exchangeQuickBooksCode(code);
    const displayName = `QuickBooks (Company ${realmId})`;

    await prisma.integration.upsert({
      where: { provider: "quickbooks" },
      create: {
        provider: "quickbooks",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        accountId: realmId,
        displayName,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        accountId: realmId,
        displayName,
      },
    });

    return new NextResponse(CLOSE_POPUP_HTML(true, `Connected to ${displayName}`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return new NextResponse(CLOSE_POPUP_HTML(false, message), {
      headers: { "Content-Type": "text/html" },
    });
  }
}
