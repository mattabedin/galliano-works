"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";

type QuoteStatus = "pending" | "accepted" | "rejected";

interface Quote {
  id: string;
  sub: { id: string; name: string; color: string; initials: string; trade: string; rate: number };
  address: string;
  description: string;
  amount: number;
  submittedDate: string;
  status: QuoteStatus;
}

const MOCK_QUOTES: Quote[] = [
  {
    id: "q1",
    sub: { id: "s1", name: "Tom Mitchell", color: "#6b8cbf", initials: "TM", trade: "HVAC", rate: 85 },
    address: "847 Elmwood Ave, Unit 3B",
    description: "Full HVAC system inspection and filter replacement — includes coil cleaning and refrigerant check",
    amount: 680,
    submittedDate: "May 29, 2025",
    status: "pending",
  },
  {
    id: "q2",
    sub: { id: "s2", name: "Karen Reyes", color: "#8a5a8a", initials: "KR", trade: "Plumbing", rate: 80 },
    address: "1204 Birchwood Pl",
    description: "Bathroom drain clearing and P-trap replacement — guest bath",
    amount: 320,
    submittedDate: "May 28, 2025",
    status: "pending",
  },
  {
    id: "q3",
    sub: { id: "s3", name: "David Shaw", color: "#4a8a6a", initials: "DS", trade: "Painting", rate: 70 },
    address: "39 Harborview Dr, Unit 12",
    description: "Interior repaint — living room and hallway, two coats, ceilings included",
    amount: 1850,
    submittedDate: "May 26, 2025",
    status: "accepted",
  },
  {
    id: "q4",
    sub: { id: "s4", name: "James Park", color: "#c9782a", initials: "JP", trade: "Electrical", rate: 95 },
    address: "516 Maple Glen Ct",
    description: "Electrical panel inspection and GFCI outlet installation — kitchen and bathrooms",
    amount: 2350,
    submittedDate: "May 24, 2025",
    status: "accepted",
  },
  {
    id: "q5",
    sub: { id: "s1", name: "Tom Mitchell", color: "#6b8cbf", initials: "TM", trade: "HVAC", rate: 85 },
    address: "23 Parkside Lane",
    description: "Emergency water heater replacement — 50-gallon gas unit",
    amount: 1420,
    submittedDate: "May 22, 2025",
    status: "rejected",
  },
];

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const meta = {
    pending:  { label: "Pending",  bg: "#fef4e6", fg: "#8a5a1a", dot: "#d89538" },
    accepted: { label: "Accepted", bg: "#e8f1ec", fg: "#2f6848", dot: "#4a8a6e" },
    rejected: { label: "Declined", bg: "#f4f4f2", fg: "#787570", dot: "#b8b5ae" },
  }[status];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: meta.bg, color: meta.fg,
      fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
      {meta.label}
    </span>
  );
}

export function QuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const [declineOpen, setDeclineOpen] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const pendingCount = quotes.filter((q) => q.status === "pending").length;
  const acceptedThisWeek = quotes.filter((q) => q.status === "accepted").length;
  const acceptedValue = quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + q.amount, 0);

  const handleAccept = (id: string) => {
    setAccepted((prev) => new Set([...prev, id]));
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, status: "accepted" } : q));
  };

  const handleDeclineOpen = (id: string) => {
    setDeclineOpen(declineOpen === id ? null : id);
    setDeclineReason("");
  };

  const handleDeclineConfirm = (id: string) => {
    setDeclined((prev) => new Set([...prev, id]));
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, status: "rejected" } : q));
    setDeclineOpen(null);
    setDeclineReason("");
  };

  return (
    <div style={{ padding: "24px 28px 36px", display: "flex", flexDirection: "column", gap: 18 }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1a1814", margin: 0, letterSpacing: "-0.01em" }}>
            Subcontractor Quotes
          </h1>
          <p style={{ fontSize: 13, color: "#6b6860", margin: "4px 0 0" }}>
            Review and act on submitted quotes from your subs
          </p>
        </div>
        <Btn variant="secondary" size="md" icon={<Icon.download />}>Export</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Pending review</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "#8a5a1a", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{pendingCount}</div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>Awaiting your decision</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Accepted this week</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "#2f6848", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{acceptedThisWeek}</div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>Invoices created automatically</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Value accepted</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "#1a1814", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{fmt$(acceptedValue)}</div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>In accepted quotes</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>

        <Card pad={0}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814" }}>All Quotes</div>
              <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 2 }}>{quotes.length} total · {pendingCount} pending</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#f4f2ec", borderRadius: 8, padding: "0 10px", height: 30 }}>
                <Icon.search style={{ color: "#8a8780" }} />
                <input
                  placeholder="Search quotes…"
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, fontFamily: "inherit", color: "#1a1814", width: 130 }}
                />
              </div>
            </div>
          </div>
          <Divider />

          <div>
            {quotes.map((q, i) => {
              const justAccepted = accepted.has(q.id);
              const isDeclineOpen = declineOpen === q.id;

              return (
                <div key={q.id} style={{ borderBottom: i < quotes.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                  <div style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <Avatar sub={q.sub} size={36} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1814" }}>{q.sub.name}</span>
                        <QuoteStatusPill status={q.status} />
                        <span style={{ fontSize: 11, color: "#a8a49c", display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon.clock style={{ width: 11, height: 11 }} />
                          {q.submittedDate}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon.receipt style={{ width: 11, height: 11, flexShrink: 0 }} />
                        {q.address}
                      </div>
                      <div style={{ fontSize: 13, color: "#3a3832", marginTop: 7, lineHeight: 1.45 }}>
                        {q.description}
                      </div>

                      {justAccepted && q.status === "accepted" && (
                        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f1ec", border: "1px solid #c0d9c8", borderRadius: 8, padding: "7px 12px" }}>
                          <Icon.checkCircle style={{ width: 14, height: 14, color: "#2f6848" }} />
                          <span style={{ fontSize: 12, color: "#2f6848", fontWeight: 500 }}>Invoice created automatically</span>
                        </div>
                      )}

                      {q.status === "pending" && !justAccepted && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <Btn variant="success" size="sm" icon={<Icon.check />} onClick={() => handleAccept(q.id)}>
                            Accept quote
                          </Btn>
                          <Btn variant="secondary" size="sm" onClick={() => handleDeclineOpen(q.id)}>
                            Decline
                          </Btn>
                        </div>
                      )}

                      {isDeclineOpen && (
                        <div style={{ marginTop: 12, background: "#fef9f2", border: "1px solid #f0d890", borderRadius: 8, padding: "12px 14px" }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a5a1a", display: "block", marginBottom: 6 }}>
                            Reason for declining (optional)
                          </label>
                          <textarea
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="Let the sub know why this quote was declined…"
                            rows={3}
                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #e0c878", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", background: "#fff", outline: "none", color: "#1a1814" }}
                          />
                          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                            <Btn variant="ghost" size="sm" onClick={() => setDeclineOpen(null)}>Cancel</Btn>
                            <Btn variant="danger" size="sm" onClick={() => handleDeclineConfirm(q.id)}>Confirm decline</Btn>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: "#1a1814", fontVariantNumeric: "tabular-nums" }}>{fmt$(q.amount)}</div>
                      <div style={{ fontSize: 11, color: "#a8a49c", marginTop: 2 }}>quoted</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", marginBottom: 14 }}>Quick Stats</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>Quotes this month</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "#1a1814", fontVariantNumeric: "tabular-nums" }}>12</div>
              </div>
              <Divider />
              <div>
                <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>Acceptance rate</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#2f6848", fontVariantNumeric: "tabular-nums" }}>74%</div>
                  <div style={{ fontSize: 11.5, color: "#2f6848", marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon.arrowUp style={{ width: 11, height: 11 }} /> +6% vs last month
                  </div>
                </div>
                <div style={{ height: 6, background: "#ecebe6", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "74%", background: "#2f6848", borderRadius: 999 }} />
                </div>
              </div>
              <Divider />
              <div>
                <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>Avg quote value</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "#1a1814", fontVariantNumeric: "tabular-nums" }}>$924</div>
              </div>
              <Divider />
              <div>
                <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>By sub</div>
                {[
                  { name: "Tom Mitchell", initials: "TM", color: "#6b8cbf", count: 4 },
                  { name: "David Shaw",   initials: "DS", color: "#4a8a6a", count: 3 },
                  { name: "Karen Reyes",  initials: "KR", color: "#8a5a8a", count: 3 },
                  { name: "James Park",   initials: "JP", color: "#c9782a", count: 2 },
                ].map((s) => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: s.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                      {s.initials}
                    </div>
                    <div style={{ flex: 1, fontSize: 12, color: "#3a3832", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#6b6860", fontWeight: 500 }}>{s.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", marginBottom: 4 }}>Recent activity</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginBottom: 14 }}>Last 7 days</div>
            {[
              { label: "Quote submitted", sub: "Tom Mitchell", time: "2h ago", dot: "#6b8cbf" },
              { label: "Quote accepted", sub: "David Shaw", time: "2d ago", dot: "#2f6848" },
              { label: "Quote declined", sub: "Tom Mitchell", time: "3d ago", dot: "#b8b5ae" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.dot, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#1a1814", fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#8a8780", marginTop: 1 }}>{item.sub} · {item.time}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
