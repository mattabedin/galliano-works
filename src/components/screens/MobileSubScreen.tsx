"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, PayHistory, LineItem, lineLabor, fmt$ } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { updateLineStatus } from "@/lib/actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  payHistory: PayHistory[];
  currentSubId: string;
  onUpdate: (invoices: Invoice[]) => void;
}

export function MobileSubScreen({ invoices, subs, payHistory, currentSubId, onUpdate }: Props) {
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<"jobs" | "earnings">("jobs");
  const [, startTransition] = useTransition();

  const sub = subs.find((s) => s.id === currentSubId) || subs[0];

  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client, address: inv.address }))
  );
  const myLines = allLines.filter((l) => l.sub?.id === currentSubId || l.subId === currentSubId);
  const active = myLines.filter((l) => ["assigned", "in_progress", "submitted"].includes(l.status));
  const paid = myLines.filter((l) => l.status === "approved" || l.status === "paid");

  const toBePaid = myLines.filter((l) => l.status === "approved").reduce((s, l) => s + lineLabor(l), 0);
  const paidYTD = payHistory.filter((p) => p.subId === currentSubId).reduce((s, p) => s + p.amount, 0);

  const setStatus = (lineId: string, status: string) => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) => l.id === lineId ? { ...l, status: status as LineItem["status"] } : l),
    }));
    onUpdate(updated);
    startTransition(async () => { await updateLineStatus(lineId, status); });
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#fafaf8", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "44px 20px 14px", background: "#1a1814", color: "#fafaf8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar sub={sub} size={36} />
            <div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>Good morning,</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{sub?.name.split(" ")[0]}</div>
            </div>
          </div>
          <button style={{ background: "rgba(255,255,255,0.1)", border: "none", width: 32, height: 32, borderRadius: 8, color: "#fafaf8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.logout />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "14px 20px 0", background: "#1a1814", display: "flex", gap: 4 }}>
        {[
          { id: "jobs" as const, label: `Jobs · ${active.length}` },
          { id: "earnings" as const, label: "Earnings" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 8px", fontSize: 13, fontWeight: 500,
            background: tab === t.id ? "#fafaf8" : "transparent",
            color: tab === t.id ? "#1a1814" : "rgba(250,250,248,0.6)",
            border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 84px" }}>
        {tab === "jobs" && (
          <>
            {toBePaid > 0 && (
              <div style={{ background: "#e8f1ec", border: "1px solid #c9e0d1", borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2f6848", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon.money />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt$(toBePaid)} coming Friday</div>
                  <div style={{ fontSize: 11.5, color: "#4a4740" }}>Direct deposit · {paid.filter((l) => l.status === "approved").length} items approved</div>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>
              My jobs · This week
            </div>

            {active.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13, background: "#fff", borderRadius: 12, border: "1px solid #ecebe6" }}>
                No active jobs — nice work 🎉
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {active.map((l) => (
                <MobileJobCard
                  key={l.id}
                  line={l}
                  onStart={() => { setStatus(l.id, "in_progress"); showToast("Marked as in progress"); }}
                  onComplete={() => { setStatus(l.id, "submitted"); showToast("Sent for approval", "success"); }}
                />
              ))}
            </div>
          </>
        )}

        {tab === "earnings" && (
          <>
            <div style={{ background: "linear-gradient(165deg, #1a1814 0%, #2b2520 100%)", color: "#fafaf8", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Earnings YTD</div>
              <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {fmt$(paidYTD + toBePaid)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                {fmt$(toBePaid)} pending · {fmt$(paidYTD)} paid
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 3, alignItems: "flex-end", height: 40 }}>
                {[0.3, 0.5, 0.7, 0.55, 0.8, 0.65, 0.9].map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${v * 100}%`, background: `${sub?.color || "#6b8cbf"}cc`, borderRadius: 2 }} />
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>
              Pay history
            </div>
            <div style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, overflow: "hidden" }}>
              {payHistory.filter((p) => p.subId === currentSubId).map((p, i, arr) => (
                <div key={p.id} style={{ padding: "14px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8f1ec", color: "#2f6848", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon.pdf />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Week of {p.week}</div>
                    <div style={{ fontSize: 11, color: "#8a8780" }}>{p.items} items · Paid</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(p.amount)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {toast}
    </div>
  );
}

function MobileJobCard({ line, onStart, onComplete }: {
  line: LineItem & { invNum?: string; client?: string; address?: string };
  onStart: () => void;
  onComplete: () => void;
}) {
  const [expanded, setExpanded] = useState(line.status === "in_progress");
  const [notes, setNotes] = useState("");

  return (
    <div style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 14, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{line.invNum}</div>
            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35, marginTop: 3 }}>{line.desc}</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{line.client}</div>
            <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>📍 {line.address}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(lineLabor(line))}</div>
            <div style={{ marginTop: 6 }}><StatusPill status={line.status} size="sm" /></div>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <Divider />
          <div style={{ padding: 14 }}>
            {line.status === "assigned" && (
              <Btn variant="primary" size="md" style={{ width: "100%", justifyContent: "center" }} onClick={onStart}>
                Start job
              </Btn>
            )}
            {line.status === "in_progress" && (
              <>
                <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 6 }}>
                  Completion notes (optional)
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you complete? Any issues?"
                  style={{ width: "100%", minHeight: 60, padding: 10, border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                <Btn variant="success" size="md" icon={<Icon.check />} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
                  onClick={onComplete}>
                  Mark complete & submit
                </Btn>
              </>
            )}
            {line.status === "submitted" && (
              <div style={{ padding: 12, background: "#f0ebf7", borderRadius: 8, fontSize: 12.5, color: "#5c3d8a", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon.clock />
                Waiting for admin approval
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
