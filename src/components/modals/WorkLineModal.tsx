"use client";

import { useState } from "react";
import { InvoiceRecordData, InvoiceLineItemData } from "@/lib/invoice-types";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icons";
import { fmt$ } from "@/lib/types";
import { createWorkLines } from "@/lib/invoice-actions";

interface WorkLineEntry {
  lineItemId: string;
  title: string;
  description: string;
  selected: boolean;
}

interface Props {
  invoice: InvoiceRecordData;
  preSelectedLineItemIds: string[];
  onClose: () => void;
  onCreated: () => void;
}

export function WorkLineModal({ invoice, preSelectedLineItemIds, onClose, onCreated }: Props) {
  const eligibleItems = invoice.lineItems.filter((li) => li.isWorkRelated && li.workLines.length === 0);

  const [entries, setEntries] = useState<WorkLineEntry[]>(
    eligibleItems.map((li) => ({
      lineItemId: li.id,
      title: li.description,
      description: "",
      selected: preSelectedLineItemIds.includes(li.id),
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = entries.filter((e) => e.selected).length;

  function toggleEntry(lineItemId: string) {
    setEntries((prev) =>
      prev.map((e) => e.lineItemId === lineItemId ? { ...e, selected: !e.selected } : e)
    );
  }

  function updateTitle(lineItemId: string, title: string) {
    setEntries((prev) =>
      prev.map((e) => e.lineItemId === lineItemId ? { ...e, title } : e)
    );
  }

  function updateDescription(lineItemId: string, description: string) {
    setEntries((prev) =>
      prev.map((e) => e.lineItemId === lineItemId ? { ...e, description } : e)
    );
  }

  function selectAll() {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: true })));
  }

  function selectNone() {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: false })));
  }

  async function handleCreate() {
    const selected = entries.filter((e) => e.selected);
    if (selected.length === 0) { setError("Select at least one line item"); return; }
    const invalid = selected.filter((e) => !e.title.trim());
    if (invalid.length > 0) { setError("All selected items need a title"); return; }

    setLoading(true);
    setError("");
    try {
      const result = await createWorkLines(
        selected.map((e) => ({
          lineItemId: e.lineItemId,
          title: e.title.trim(),
          description: e.description.trim() || undefined,
        }))
      );
      if (result.success) onCreated();
    } catch {
      setError("Failed to create work lines. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const lineItemMap = new Map(eligibleItems.map((li) => [li.id, li]));

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(26,24,20,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 640, maxHeight: "88vh", background: "#fff", borderRadius: 14,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Create Work Lines</div>
            <div style={{ fontSize: 12.5, color: "#8a8780", marginTop: 3 }}>
              {invoice.invoiceNumber} · {invoice.customerName}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8a8780" }}>
            <Icon.x />
          </button>
        </div>
        <div style={{ height: 1, background: "#ecebe6", flexShrink: 0 }} />

        {/* Controls */}
        <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: "#6b6860" }}>
            {selectedCount} of {eligibleItems.length} selected
          </div>
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" size="sm" onClick={selectAll} disabled={selectedCount === eligibleItems.length}>All</Btn>
          <Btn variant="ghost" size="sm" onClick={selectNone} disabled={selectedCount === 0}>None</Btn>
        </div>

        {/* Line items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px" }}>
          {eligibleItems.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#8a8780", fontSize: 13 }}>
              All work-related line items already have work lines.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
              {entries.map((entry) => {
                const li = lineItemMap.get(entry.lineItemId)!;
                return (
                  <WorkLineEntry
                    key={entry.lineItemId}
                    entry={entry}
                    lineItem={li}
                    onToggle={() => toggleEntry(entry.lineItemId)}
                    onTitleChange={(v) => updateTitle(entry.lineItemId, v)}
                    onDescriptionChange={(v) => updateDescription(entry.lineItemId, v)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #ecebe6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            {error && (
              <div style={{ fontSize: 12.5, color: "#a8442f" }}>{error}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn
              variant="primary"
              onClick={handleCreate}
              disabled={loading || selectedCount === 0}
            >
              {loading ? "Creating…" : `Create ${selectedCount} Work Line${selectedCount !== 1 ? "s" : ""}`}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkLineEntry({
  entry, lineItem, onToggle, onTitleChange, onDescriptionChange,
}: {
  entry: WorkLineEntry;
  lineItem: InvoiceLineItemData;
  onToggle: () => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: `1.5px solid ${entry.selected ? "#1a1814" : "#ecebe6"}`,
      borderRadius: 10,
      background: entry.selected ? "#fafaf8" : "#fff",
      transition: "border-color 150ms, background 150ms",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "24px 1fr auto auto",
        gap: 12, alignItems: "center", padding: "12px 14px", cursor: "pointer",
      }} onClick={onToggle}>
        <div style={{
          width: 18, height: 18, borderRadius: 5,
          border: `2px solid ${entry.selected ? "#1a1814" : "#dcd9d2"}`,
          background: entry.selected ? "#1a1814" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 150ms",
        }}>
          {entry.selected && <Icon.check style={{ width: 10, height: 10, color: "#fff" }} />}
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{lineItem.description}</div>
          {lineItem.notes && <div style={{ fontSize: 12, color: "#8a8780", marginTop: 2 }}>{lineItem.notes}</div>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#1a1814" }}>
          {fmt$(lineItem.lineTotal)}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8a8780" }}
          title="Edit work line details"
        >
          <Icon.chevron style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms", width: 14, height: 14 }} />
        </button>
      </div>

      {expanded && entry.selected && (
        <div style={{ padding: "0 14px 14px 50px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a8780", display: "block", marginBottom: 5 }}>
              Work Line Title <span style={{ color: "#a8442f" }}>*</span>
            </label>
            <input
              value={entry.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Work line title…"
              style={{
                width: "100%", height: 34, borderRadius: 7,
                border: "1px solid #dcd9d2", padding: "0 10px",
                fontSize: 13, fontFamily: "inherit", color: "#1a1814",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8a8780", display: "block", marginBottom: 5 }}>
              Additional Notes
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Optional additional details…"
              rows={2}
              style={{
                width: "100%", borderRadius: 7,
                border: "1px solid #dcd9d2", padding: "8px 10px",
                fontSize: 13, fontFamily: "inherit", color: "#1a1814",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
