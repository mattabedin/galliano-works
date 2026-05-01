import { NextRequest, NextResponse } from "next/server";
import { exchangeFreshBooksCode, getFreshBooksBusinessId } from "@/lib/freshbooks-client";
import { prisma } from "@/lib/db";

const CLOSE_POPUP_HTML = (success: boolean, message: string) => `<!DOCTYPE html>
<html>
<head><title>FreshBooks</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage(${JSON.stringify({ type: "oauth-result", provider: "freshbooks", success, message })}, "*");
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
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(CLOSE_POPUP_HTML(false, error || "Authorization cancelled"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const tokens = await exchangeFreshBooksCode(code);
    const { businessId, displayName } = await getFreshBooksBusinessId(tokens.access_token);

    await prisma.integration.upsert({
      where: { provider: "freshbooks" },
      create: {
        provider: "freshbooks",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        accountId: businessId,
        displayName,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        accountId: businessId,
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
