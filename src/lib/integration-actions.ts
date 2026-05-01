"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { FRESHBOOKS_CONFIG } from "@/lib/freshbooks-client";
import { QUICKBOOKS_CONFIG } from "@/lib/quickbooks-client";

export type IntegrationProvider = "freshbooks" | "quickbooks";

export interface IntegrationStatus {
  provider: IntegrationProvider;
  connected: boolean;
  configured: boolean;
  displayName: string | null;
  accountId: string | null;
  expiresAt: Date | null;
}

export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const [fb, qb] = await Promise.all([
    prisma.integration.findUnique({ where: { provider: "freshbooks" } }),
    prisma.integration.findUnique({ where: { provider: "quickbooks" } }),
  ]);

  return [
    {
      provider: "freshbooks",
      connected: !!fb,
      configured: FRESHBOOKS_CONFIG.isConfigured,
      displayName: fb?.displayName || null,
      accountId: fb?.accountId || null,
      expiresAt: fb?.expiresAt || null,
    },
    {
      provider: "quickbooks",
      connected: !!qb,
      configured: QUICKBOOKS_CONFIG.isConfigured,
      displayName: qb?.displayName || null,
      accountId: qb?.accountId || null,
      expiresAt: qb?.expiresAt || null,
    },
  ];
}

export async function disconnectIntegration(provider: IntegrationProvider): Promise<void> {
  await prisma.integration.deleteMany({ where: { provider } });
  revalidatePath("/");
}
