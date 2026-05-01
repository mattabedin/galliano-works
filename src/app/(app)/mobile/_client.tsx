"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Invoice, Sub, PayHistory } from "@/lib/types";
import { InvoiceRecordData } from "@/lib/invoice-types";
import { MobileSubScreen } from "@/components/screens/MobileSubScreen";
import { Avatar } from "@/components/ui/Avatar";
import { Btn } from "@/components/ui/Btn";

export function MobilePreviewClient({
  invoices, subs, payHistory, invoiceRecords,
}: {
  invoices: Invoice[];
  subs: Sub[];
  payHistory: PayHistory[];
  invoiceRecords: InvoiceRecordData[];
}) {
  const router = useRouter();
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const currentSubId = subs[currentSubIdx]?.id ?? subs[0]?.id;
  const refresh = () => router.refresh();

  return (
    <>
      <div style={{ color: "#e8e4dc", maxWidth: 300 }}>
        <div style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5, fontWeight: 600 }}>Subcontractor app</div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 42, fontWeight: 400, margin: "12px 0 0", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
          Built for<br />the job site.
        </h2>
        <p style={{ fontSize: 13.5, opacity: 0.7, lineHeight: 1.65, marginTop: 18 }}>
          Subcontractors see only their assigned work. One tap to start, one tap to submit. Pay status is always visible.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {subs.map((s, i) => (
            <button key={s.id} onClick={() => setCurrentSubIdx(i)} style={{
              padding: "6px 10px", borderRadius: 999, fontFamily: "inherit",
              border: currentSubIdx === i ? `1.5px solid ${s.color}` : "1px solid rgba(255,255,255,0.15)",
              background: currentSubIdx === i ? "rgba(255,255,255,0.1)" : "transparent",
              color: "#e8e4dc", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12,
            }}>
              <Avatar sub={s} size={18} />
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Btn variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>← Back to admin</Btn>
        </div>
      </div>

      <PhoneFrame>
        <MobileSubScreen
          invoices={invoices}
          subs={subs}
          payHistory={payHistory}
          currentSubId={currentSubId}
          onUpdate={refresh}
          invoiceRecords={invoiceRecords}
          onRefresh={refresh}
        />
      </PhoneFrame>
    </>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 360, height: 720, background: "#1a1814",
      borderRadius: 44, padding: 10,
      boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08) inset",
      position: "relative",
    }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: "#faf8f4", position: "relative" }}>
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 110, height: 30, background: "#000", borderRadius: 18, zIndex: 10 }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", fontSize: 13, fontWeight: 600, color: "#fafaf8", zIndex: 11 }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><path d="M1 7h2v2H1zM5 5h2v4H5zM9 3h2v6H9zM13 1h2v8h-2z"/></svg>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="1" width="18" height="8" rx="2"/><rect x="3" y="3" width="13" height="4" rx="1" fill="currentColor"/></svg>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
