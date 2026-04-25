"use client";

import { useState, useRef } from "react";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icons";
import { SYSTEM_FIELDS, FieldMapping, ParsedInvoice, ValidationError, DuplicateWarning } from "@/lib/invoice-types";
import { saveImportedInvoices, checkDuplicates } from "@/lib/invoice-actions";
import { fmt$ } from "@/lib/types";

type Step = "upload" | "map" | "review" | "done";

interface ParseResult {
  columns: string[];
  preview: Record<string, string>[];
  totalRows: number;
  fileName: string;
}

interface ReviewResult {
  invoices: ParsedInvoice[];
  errors: ValidationError[];
  duplicates: DuplicateWarning[];
  totalLineItems: number;
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 22px 14px" }}>
      {steps.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3,
          background: i <= current ? "#1a1814" : "#ecebe6",
          borderRadius: 999, transition: "background 200ms",
        }} />
      ))}
    </div>
  );
}

function ModalShell({
  title, step, stepLabels, children, footer, onClose,
}: {
  title: string;
  step: number;
  stepLabels: string[];
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(26,24,20,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 600, maxHeight: "90vh", background: "#fff", borderRadius: 14,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 22px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#8a8780", marginTop: 2 }}>Step {step + 1} of {stepLabels.length}: {stepLabels[step]}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8a8780" }}>
            <Icon.x />
          </button>
        </div>
        <StepIndicator steps={stepLabels} current={step} />
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px" }}>{children}</div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #ecebe6", display: "flex", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

const STEP_LABELS = ["Upload File", "Map Columns", "Review", "Done"];

export function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping>({});
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  const [doneResult, setDoneResult] = useState<{ invoiceCount: number; lineItemCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const stepIndex = ["upload", "map", "review", "done"].indexOf(step);

  async function handleFileSelected(file: File) {
    setSelectedFile(file);
    setError("");
  }

  async function handleUpload() {
    if (!selectedFile) { setError("Please select a CSV file"); return; }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/invoices/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); return; }
      setParseResult({ columns: data.columns, preview: data.preview, totalRows: data.totalRows, fileName: data.fileName });
      const autoMap: FieldMapping = {};
      for (const sf of SYSTEM_FIELDS) {
        const match = data.columns.find((c: string) =>
          c.toLowerCase().replace(/[\s_-]/g, "").includes(sf.key.toLowerCase().replace(/[\s_-]/g, "")) ||
          sf.label.toLowerCase().replace(/[\s_-]/g, "").includes(c.toLowerCase().replace(/[\s_-]/g, ""))
        );
        if (match) autoMap[sf.key] = match;
      }
      setMappings(autoMap);
      setStep("map");
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMappingDone() {
    if (!selectedFile || !parseResult) return;
    const required = SYSTEM_FIELDS.filter((f) => f.required);
    const missing = required.filter((f) => !mappings[f.key]);
    if (missing.length > 0) {
      setError(`Please map required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("mappings", JSON.stringify(mappings));
      const res = await fetch("/api/invoices/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Mapping failed"); return; }

      const duplicates = await checkDuplicates(
        data.invoices.map((inv: ParsedInvoice) => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          invoiceDate: inv.invoiceDate,
        }))
      );

      setReviewResult({
        invoices: data.invoices,
        errors: data.errors,
        duplicates,
        totalLineItems: data.totalLineItems,
      });
      setStep("review");
    } catch {
      setError("Failed to process mappings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!reviewResult || !parseResult) return;
    setLoading(true);
    setError("");
    try {
      const invoicesToImport = ignoreDuplicates
        ? reviewResult.invoices
        : reviewResult.invoices.filter(
            (inv) => !reviewResult.duplicates.some((d) => d.invoiceNumber === inv.invoiceNumber)
          );

      if (invoicesToImport.length === 0) {
        setError("No invoices to import after excluding duplicates.");
        return;
      }

      const result = await saveImportedInvoices(invoicesToImport, parseResult.fileName);
      if (result.success) {
        setDoneResult({ invoiceCount: result.invoiceCount, lineItemCount: result.lineItemCount });
        setStep("done");
      }
    } catch {
      setError("Failed to save invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const headers = SYSTEM_FIELDS.map((f) => f.label).join(",");
    const example = [
      '"INV-1001","2026-04-20","Acme Corp","acme@example.com","555-1234","123 Main St","456 Job Site Rd","Install security cameras",4,200,800,"Rush job",3200',
    ].join("\n");
    const csv = headers + "\n" + example;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "invoice-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModalShell
      title="Import Invoices from CSV"
      step={stepIndex}
      stepLabels={STEP_LABELS}
      onClose={onClose}
      footer={
        step === "upload" ? (
          <>
            <Btn variant="ghost" size="md" icon={<Icon.download />} onClick={downloadTemplate}>Download Template</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" onClick={handleUpload} disabled={!selectedFile || loading}>
                {loading ? "Uploading…" : "Continue"}
              </Btn>
            </div>
          </>
        ) : step === "map" ? (
          <>
            <Btn variant="secondary" onClick={() => setStep("upload")}>Back</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" onClick={handleMappingDone} disabled={loading}>
                {loading ? "Processing…" : "Preview Import"}
              </Btn>
            </div>
          </>
        ) : step === "review" ? (
          <>
            <Btn variant="secondary" onClick={() => setStep("map")}>Back</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={handleConfirmImport}
                disabled={loading || (reviewResult?.errors || []).length > 0}
              >
                {loading ? "Importing…" : `Import ${reviewResult?.invoices.length} Invoice${reviewResult?.invoices.length !== 1 ? "s" : ""}`}
              </Btn>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="primary" onClick={onImported}>Done</Btn>
          </div>
        )
      }
    >
      {step === "upload" && (
        <UploadStep
          file={selectedFile}
          dragOver={dragOver}
          setDragOver={setDragOver}
          fileInputRef={fileInputRef}
          onFileSelected={handleFileSelected}
          error={error}
        />
      )}
      {step === "map" && parseResult && (
        <MappingStep
          parseResult={parseResult}
          mappings={mappings}
          setMappings={setMappings}
          error={error}
        />
      )}
      {step === "review" && reviewResult && (
        <ReviewStep
          result={reviewResult}
          ignoreDuplicates={ignoreDuplicates}
          setIgnoreDuplicates={setIgnoreDuplicates}
          error={error}
        />
      )}
      {step === "done" && doneResult && (
        <DoneStep result={doneResult} />
      )}
    </ModalShell>
  );
}

function UploadStep({
  file, dragOver, setDragOver, fileInputRef, onFileSelected, error,
}: {
  file: File | null;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (f: File) => void;
  error: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFileSelected(f); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#1a1814" : file ? "#2f6848" : "#dcd9d2"}`,
          borderRadius: 12, padding: "32px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          cursor: "pointer", transition: "border-color 150ms",
          background: dragOver ? "#faf8f4" : file ? "#f0f7f0" : "#fafaf8",
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: file ? "#e8f1ec" : "#f4f2ec",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: file ? "#2f6848" : "#8a8780",
        }}>
          {file ? <Icon.checkCircle style={{ width: 22, height: 22 }} /> : <Icon.upload style={{ width: 22, height: 22 }} />}
        </div>
        {file ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "#8a8780", marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Drop your CSV here or click to browse</div>
            <div style={{ fontSize: 12, color: "#8a8780", marginTop: 4 }}>Accepts .csv files only</div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
        />
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ background: "#faf8f4", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>CSV format requirements</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "First row must be column headers",
            "One row per line item (multiple rows can share the same invoice number)",
            "Required: Invoice Number, Invoice Date, Customer Name, Line Description, Line Total",
            "Download the template for the recommended format",
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b6860" }}>
              <span style={{ color: "#4a8a6e", flexShrink: 0 }}>✓</span>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MappingStep({
  parseResult, mappings, setMappings, error,
}: {
  parseResult: ParseResult;
  mappings: FieldMapping;
  setMappings: (m: FieldMapping) => void;
  error: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      <div style={{ fontSize: 13, color: "#6b6860" }}>
        Found <strong>{parseResult.columns.length} columns</strong> and <strong>{parseResult.totalRows} data rows</strong> in <em>{parseResult.fileName}</em>.
        Match each system field to the corresponding CSV column.
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid #f4f2ec" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.05em" }}>System Field</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.05em" }}>CSV Column</div>
        </div>

        {SYSTEM_FIELDS.map((sf) => (
          <div key={sf.key} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            padding: "8px 0", alignItems: "center",
            borderBottom: "1px solid #f9f8f5",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {sf.label}
                {sf.required && <span style={{ color: "#a8442f", marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>{sf.description}</div>
            </div>
            <select
              value={mappings[sf.key] || ""}
              onChange={(e) => setMappings({ ...mappings, [sf.key]: e.target.value })}
              style={{
                height: 32, borderRadius: 7, border: "1px solid #dcd9d2",
                padding: "0 8px", fontSize: 12.5, fontFamily: "inherit",
                background: "#fff", color: "#1a1814", cursor: "pointer",
              }}
            >
              <option value="">— not mapped —</option>
              {parseResult.columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {parseResult.preview.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            CSV Preview (first {parseResult.preview.length} rows)
          </div>
          <div style={{ overflowX: "auto", border: "1px solid #ecebe6", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#faf8f4" }}>
                  {parseResult.columns.map((col) => (
                    <th key={col} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", color: "#4a4740", borderBottom: "1px solid #ecebe6" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < parseResult.preview.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                    {parseResult.columns.map((col) => (
                      <td key={col} style={{ padding: "7px 10px", color: "#6b6860", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row[col] || <span style={{ color: "#b8b5ae" }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  result, ignoreDuplicates, setIgnoreDuplicates, error,
}: {
  result: ReviewResult;
  ignoreDuplicates: boolean;
  setIgnoreDuplicates: (v: boolean) => void;
  error: string;
}) {
  const hasErrors = result.errors.length > 0;
  const hasDuplicates = result.duplicates.length > 0;
  const willImport = ignoreDuplicates
    ? result.invoices.length
    : result.invoices.filter((inv) => !result.duplicates.some((d) => d.invoiceNumber === inv.invoiceNumber)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Invoices", value: result.invoices.length, color: "#1a1814" },
          { label: "Line Items", value: result.totalLineItems, color: "#1a1814" },
          { label: "Errors", value: result.errors.length, color: result.errors.length > 0 ? "#a8442f" : "#2f6848" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#faf8f4", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      {hasErrors && (
        <div style={{ background: "#fbeee9", border: "1px solid #f0c8b8", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#a8442f", marginBottom: 8 }}>
            {result.errors.length} validation error{result.errors.length !== 1 ? "s" : ""} — fix before importing
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
            {result.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 12, color: "#8a3020" }}>
                <strong>Row {err.rowNumber}:</strong> {err.message}
                {err.value && <span style={{ color: "#a8442f" }}> ("{err.value}")</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDuplicates && !hasErrors && (
        <div style={{ background: "#fef8e6", border: "1px solid #f0dea0", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#8a5a1a", marginBottom: 8 }}>
            {result.duplicates.length} possible duplicate{result.duplicates.length !== 1 ? "s" : ""} detected
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {result.duplicates.map((d, i) => (
              <div key={i} style={{ fontSize: 12, color: "#6b4a14" }}>
                <strong>{d.invoiceNumber}</strong> · {d.customerName} · {d.invoiceDate} already exists
              </div>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ignoreDuplicates}
              onChange={(e) => setIgnoreDuplicates(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            <span style={{ fontSize: 12.5, color: "#6b4a14" }}>Import duplicates anyway</span>
          </label>
        </div>
      )}

      {!hasErrors && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Invoice Preview ({willImport} will be imported)
          </div>
          <div style={{ border: "1px solid #ecebe6", borderRadius: 10, overflow: "hidden" }}>
            {result.invoices.slice(0, 8).map((inv, i) => {
              const isDup = result.duplicates.some((d) => d.invoiceNumber === inv.invoiceNumber);
              const skip = isDup && !ignoreDuplicates;
              return (
                <div key={i} style={{
                  padding: "10px 14px",
                  borderBottom: i < Math.min(result.invoices.length, 8) - 1 ? "1px solid #f4f2ec" : "none",
                  display: "flex", alignItems: "center", gap: 10,
                  opacity: skip ? 0.5 : 1,
                }}>
                  {skip ? (
                    <span style={{ color: "#d89538" }}>⚠</span>
                  ) : (
                    <Icon.checkCircle style={{ color: "#2f6848", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{inv.invoiceNumber}</span>
                    <span style={{ color: "#6b6860", fontSize: 12, marginLeft: 8 }}>{inv.customerName}</span>
                    {isDup && <span style={{ fontSize: 11, color: "#8a5a1a", marginLeft: 8, background: "#fef4e6", padding: "1px 6px", borderRadius: 4 }}>duplicate</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#8a8780" }}>{inv.lineItems.length} line{inv.lineItems.length !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(inv.invoiceTotal)}</div>
                </div>
              );
            })}
            {result.invoices.length > 8 && (
              <div style={{ padding: "10px 14px", fontSize: 12, color: "#8a8780", borderTop: "1px solid #f4f2ec" }}>
                + {result.invoices.length - 8} more invoice{result.invoices.length - 8 !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DoneStep({ result }: { result: { invoiceCount: number; lineItemCount: number } }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 16, textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#e8f1ec",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#2f6848",
      }}>
        <Icon.check style={{ width: 28, height: 28 }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Import complete</div>
        <div style={{ fontSize: 13.5, color: "#6b6860", marginTop: 6 }}>
          {result.invoiceCount} invoice{result.invoiceCount !== 1 ? "s" : ""} imported with {result.lineItemCount} line item{result.lineItemCount !== 1 ? "s" : ""}.
        </div>
        <div style={{ fontSize: 13, color: "#8a8780", marginTop: 4 }}>
          Open any invoice to review and create work lines.
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: "#fbeee9", border: "1px solid #f0c8b8",
      borderRadius: 8, padding: "10px 12px",
      fontSize: 13, color: "#a8442f",
    }}>
      {message}
    </div>
  );
}
