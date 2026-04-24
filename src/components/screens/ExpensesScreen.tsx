"use client";

import { useState, useTransition } from "react";
import { Invoice, Sub, LineItem, fmt$ } from "@/lib/types";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { addExpense } from "@/lib/actions";

interface Props {
  invoices: Invoice[];
  subs: Sub[];
  onUpdate: (invoices: Invoice[]) => void;
}

export function ExpensesScreen({ invoices, subs, onUpdate }: Props) {
  const [toast, showToast] = useToast();
  const [adding, setAdding] = useState<(LineItem & { invNum: string; client: string }) | null>(null);
  const [category, setCategory] = useState("Materials");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  const allLines = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({ ...l, invNum: inv.number, client: inv.client }))
  );
  const withExpenses = allLines.filter((l) => (l.expenses || 0) > 0);

  const submit = () => {
    const amt = parseFloat(amount) || 0;
    if (!adding) return;
    const updated = invoices.map((inv) => ({
      ...inv,
      lines: inv.lines.map((l) => l.id === adding.id ? { ...l, expenses: (l.expenses || 0) + amt } : l),
    }));
    onUpdate(updated);
    showToast(`Added ${fmt$(amt)} ${category.toLowerCase()} expense`, "success");
    setAdding(null);
    setAmount("");
    setNote("");
    startTransition(async () => { await addExpense(adding.id, amt); });
  };

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="primary" size="md" icon={<Icon.plus />} onClick={() => setAdding(allLines[0] || null)}>Log expense</Btn>
      </div>

      <Card pad={0}>
        <div style={{ padding: "14px 20px 10px", display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr", gap: 12, fontSize: 10.5, color: "#8a8780", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <div>Line item</div>
          <div>Invoice</div>
          <div style={{ textAlign: "right" }}>Invoice $</div>
          <div style={{ textAlign: "right" }}>Expenses</div>
          <div style={{ textAlign: "right" }}>Impact</div>
        </div>
        <Divider />
        {withExpenses.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13 }}>No expenses logged yet</div>
        )}
        {withExpenses.map((l, i) => (
          <div key={l.id} style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr", gap: 12, alignItems: "center", borderBottom: i < withExpenses.length - 1 ? "1px solid #f4f2ec" : "none" }}>
            <div style={{ fontSize: 13 }}>{l.desc}</div>
            <div style={{ fontSize: 12, color: "#6b6860" }}>{l.invNum} · {l.client}</div>
            <div style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmt$(l.invoice)}</div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "#8a5a1a" }}>{fmt$(l.expenses)}</div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#6b6860", fontVariantNumeric: "tabular-nums" }}>{l.invoice ? ((l.expenses / l.invoice) * 100).toFixed(1) : 0}% of invoice</div>
          </div>
        ))}
      </Card>

      {adding && (
        <div onClick={() => setAdding(null)} style={{ position: "absolute", inset: 0, background: "rgba(26,24,20,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Log expense</div>
              <button onClick={() => setAdding(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon.x /></button>
            </div>
            <Divider />
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Line item">
                <select value={adding.id} onChange={(e) => {
                  const line = allLines.find((l) => l.id === e.target.value);
                  if (line) setAdding(line);
                }} style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                  {allLines.map((l) => <option key={l.id} value={l.id}>{l.invNum} · {l.desc}</option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Category">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" }}>
                    {["Materials", "Travel", "Equipment rental", "Permits", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Amount">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a8780", fontSize: 13 }}>$</span>
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                      style={{ width: "100%", height: 38, padding: "0 10px 0 22px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
                  </div>
                </Field>
              </div>
              <Field label="Note (optional)">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, receipt number…"
                  style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
              </Field>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid #ecebe6", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setAdding(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={submit}>Save expense</Btn>
            </div>
          </div>
        </div>
      )}
      {toast}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
