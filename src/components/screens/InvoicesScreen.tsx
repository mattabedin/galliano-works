"use client";

import { useState } from "react";
import { Invoice, Sub, invoiceTotals, lineLabor, lineProfit, fmt$ } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";

export function InvoicesScreen({ invoices, subs }: { invoices: Invoice[]; subs: Sub[] }) {
  const [expanded, setExpanded] = useState(new Set([invoices[0]?.id]));
  const [showImport, setShowImport] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="secondary" size="md" icon={<Icon.search />}>Search</Btn>
        <Btn variant="secondary" size="md" icon={<Icon.filter />}>Filter</Btn>
        <Btn variant="primary" size="md" icon={<Icon.upload />} onClick={() => setShowImport(true)}>Import</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invoices.map((inv) => (
          <InvoiceRow key={inv.id} inv={inv} subs={subs} expanded={expanded.has(inv.id)} onToggle={() => toggle(inv.id)} />
        ))}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function InvoiceRow({ inv, subs, expanded, onToggle }: { inv: Invoice; subs: Sub[]; expanded: boolean; onToggle: () => void }) {
  const t = invoiceTotals(inv);
  const statusCount = inv.lines.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card pad={0}>
      <div onClick={onToggle} style={{
        padding: "16px 20px", display: "grid",
        gridTemplateColumns: "20px 1fr auto auto auto auto", gap: 16,
        alignItems: "center", cursor: "pointer",
      }}>
        <div style={{ color: "#8a8780", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms" }}>
          <Icon.chevron />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{inv.number}</span>
            <span style={{ fontSize: 10.5, color: "#8a8780", background: "#f4f2ec", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>{inv.source}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "#6b6860", marginTop: 3 }}>{inv.client} · {inv.address}</div>
        </div>
        <div style={{ fontSize: 11.5, color: "#6b6860" }}>
          <div>Issued {inv.issued.slice(5)}</div>
          <div style={{ color: "#8a8780" }}>Due {inv.due.slice(5)}</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Object.entries(statusCount).map(([s, n]) => {
            const sm = { bg: "#f4f4f2", fg: "#787570" };
            const colors: Record<string, { bg: string; fg: string }> = {
              unassigned: { bg: "#f4f4f2", fg: "#787570" },
              assigned: { bg: "#eef2f7", fg: "#3b5378" },
              in_progress: { bg: "#fef4e6", fg: "#8a5a1a" },
              submitted: { bg: "#f0ebf7", fg: "#5c3d8a" },
              approved: { bg: "#e8f1ec", fg: "#2f6848" },
              paid: { bg: "#e6f0f2", fg: "#1f5a66" },
            };
            const c = colors[s] || sm;
            return (
              <span key={s} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: c.bg, color: c.fg, fontWeight: 500 }}>{n}</span>
            );
          })}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(t.invoice)}</div>
          <div style={{ fontSize: 11, color: t.profit > 0 ? "#2f6848" : "#a8442f", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {fmt$(t.profit)} profit ({(t.margin * 100).toFixed(0)}%)
          </div>
        </div>
        <Btn variant="ghost" size="sm"><Icon.dots /></Btn>
      </div>

      {expanded && (
        <>
          <Divider />
          <div style={{ padding: "6px 20px 14px 56px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "#8a8780", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
                  <th style={{ textAlign: "left", padding: "10px 6px", width: 28 }}>#</th>
                  <th style={{ textAlign: "left", padding: "10px 6px" }}>Description</th>
                  <th style={{ textAlign: "left", padding: "10px 6px" }}>Assigned</th>
                  <th style={{ textAlign: "right", padding: "10px 6px" }}>Invoice</th>
                  <th style={{ textAlign: "right", padding: "10px 6px" }}>Labor</th>
                  <th style={{ textAlign: "right", padding: "10px 6px" }}>Exp.</th>
                  <th style={{ textAlign: "right", padding: "10px 6px" }}>Profit</th>
                  <th style={{ padding: "10px 6px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l, i) => {
                  const sub = l.sub || subs.find((s) => s.id === l.subId) || null;
                  const profit = lineProfit(l);
                  return (
                    <tr key={l.id} style={{ borderTop: "1px solid #f4f2ec" }}>
                      <td style={{ padding: "10px 6px", color: "#8a8780", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                      <td style={{ padding: "10px 6px" }}>{l.desc}</td>
                      <td style={{ padding: "10px 6px" }}>
                        {sub ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <Avatar sub={sub} size={22} />
                            <span>{sub.name.split(" ")[0]} {sub.name.split(" ")[1]?.[0]}.</span>
                          </div>
                        ) : <span style={{ color: "#a8a49c", fontStyle: "italic" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt$(l.invoice)}</td>
                      <td style={{ padding: "10px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#6b6860" }}>{fmt$(lineLabor(l))}</td>
                      <td style={{ padding: "10px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#6b6860" }}>{l.expenses ? fmt$(l.expenses) : "—"}</td>
                      <td style={{ padding: "10px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500, color: profit > 0 ? "#2f6848" : "#a8442f" }}>{fmt$(profit)}</td>
                      <td style={{ padding: "10px 6px" }}><StatusPill status={l.status} size="sm" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState("freshbooks");
  const steps = ["Source", "Preview", "Imported"];

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, background: "rgba(26,24,20,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 520, background: "#fff", borderRadius: 14,
        boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden",
      }}>
        <div style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Import invoices</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icon.x /></button>
        </div>
        <div style={{ padding: "0 22px 6px", display: "flex", gap: 4 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, background: i <= step ? "#1a1814" : "#ecebe6", borderRadius: 999, transition: "background 200ms" }} />
          ))}
        </div>

        <div style={{ padding: 22, minHeight: 220 }}>
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#6b6860" }}>Choose an import source</div>
              {[
                { v: "freshbooks", label: "FreshBooks", sub: "Connected · last sync 2h ago", disabled: false },
                { v: "csv", label: "CSV file", sub: "Upload from your computer", disabled: false },
                { v: "quickbooks", label: "QuickBooks", sub: "Coming soon", disabled: true },
              ].map((o) => (
                <button key={o.v} onClick={() => !o.disabled && setSource(o.v)} disabled={o.disabled} style={{
                  padding: 14, textAlign: "left", borderRadius: 10,
                  border: source === o.v ? "1.5px solid #1a1814" : "1px solid #ecebe6",
                  background: o.disabled ? "#fafaf8" : "#fff",
                  cursor: o.disabled ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: o.disabled ? 0.5 : 1,
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{o.label}</div>
                  <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>{o.sub}</div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ fontSize: 13, color: "#6b6860", marginBottom: 10 }}>3 new invoices ready to import · 12 line items</div>
              <div style={{ border: "1px solid #ecebe6", borderRadius: 8, overflow: "hidden" }}>
                {["INV-1028 · Oakview Estates · $4,200", "INV-1029 · Riverside Labs · $2,850", "INV-1030 · Thornton Ranch HOA · $1,640"].map((x, i) => (
                  <div key={i} style={{ padding: "10px 14px", fontSize: 13, borderBottom: i < 2 ? "1px solid #f4f2ec" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon.checkCircle style={{ color: "#2f6848" }} />
                    {x}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e8f1ec", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#2f6848" }}>
                <Icon.check style={{ width: 24, height: 24 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>3 invoices imported</div>
              <div style={{ fontSize: 13, color: "#6b6860", marginTop: 4 }}>12 new line items ready to assign</div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid #ecebe6", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => step < 2 ? setStep(step + 1) : onClose()}>
            {step === 2 ? "Done" : "Continue"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
