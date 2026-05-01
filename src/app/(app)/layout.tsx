import { AppShell } from "@/components/layout/AppShell";
import { getBadgeCounts } from "@/lib/invoice-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const badges = await getBadgeCounts();
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <AppShell badges={badges}>
        {children}
      </AppShell>
    </div>
  );
}
