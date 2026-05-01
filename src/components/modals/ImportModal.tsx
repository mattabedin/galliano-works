"use client";

import { useState, useRef, useEffect } from "react";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icons";
import { SYSTEM_FIELDS, FieldMapping, ParsedInvoice, ValidationError, DuplicateWarning } from "@/lib/invoice-types";
import { saveImportedInvoices, checkDuplicates } from "@/lib/invoice-actions";
import { disconnectIntegration, getIntegrationStatuses, IntegrationStatus } from "@/lib/integration-actions";
import { fmt$ } from "@/lib/types";

type Source = "csv" | "freshbooks" | "quickbooks";
type Step = "source" | "upload" | "map" | "connect" | "configure" | "review" | "done";

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
  sourceLabel: string;
}

const PROVIDER_META = {
  freshbooks: {
    label: "FreshBooks",
    color: "#0075dd",
    bg: "#e8f2fc",
    description: "Import invoices directly from your FreshBooks account",
    logo: "FB",
  },
  quickbooks: {
    label: "QuickBooks",
    color: "#2ca01c",
    bg: "#e8f5e9",
    description: "Import invoices directly from QuickBooks Online",
    logo: "QB",
  },
};

function StepIndicator({ count, current }: { count: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 22px 14px" }}>
      {Array.from({ length: count }).map((_, i) => (
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
  title, subtitle, stepIndex, stepCount, children, footer, onClose,
}: {
  title: string;
  subtitle: string;
  stepIndex: number;
  stepCount: number;
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
        width: 620, maxHeight: "90vh", background: "#fff", borderRadius: 14,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 22px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#8a8780", marginTop: 2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8a8780" }}>
            <Icon.x />
          </button>
        </div>
        <StepIndicator count={stepCount} current={stepIndex} />
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px" }}>{children}</div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #ecebe6", display: "flex", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

export function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [step, setStep] = useState<Step>("source");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // CSV state
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Provider state
  const [connectStatus, setConnectStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [connectMessage, setConnectMessage] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Shared review/done state
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  const [doneResult, setDoneResult] = useState<{ invoiceCount: number; lineItemCount: number } | null>(null);

  // Load integration statuses on mount
  useEffect(() => {
    getIntegrationStatuses().then(setIntegrationStatuses).catch(() => {});
  }, []);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "oauth-result") return;
      if (event.data.success) {
        setConnectStatus("connected");
        setConnectMessage(event.data.message || "Connected successfully");
        // Refresh statuses after successful OAuth
        getIntegrationStatuses().then(setIntegrationStatuses).catch(() => {});
      } else {
        setConnectStatus("error");
        setConnectMessage(event.data.message || "Connection failed");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const getIntegrationStatus = (provider: Source) =>
    integrationStatuses.find((s) => s.provider === provider);

  // Step index for progress indicator
  const STEP_COUNT = { source: 5 };
  const stepSequence: Step[] = source === "csv"
    ? ["source", "upload", "map", "review", "done"]
    : ["source", "connect", "configure", "review", "done"];
  const stepIndex = stepSequence.indexOf(step);

  const title = source === "freshbooks" ? "Import from FreshBooks"
    : source === "quickbooks" ? "Import from QuickBooks"
    : "Import Invoices";
  const subtitle = step === "source" ? "Choose your import source"
    : step === "upload" ? "Step 2 of 5: Upload CSV file"
    : step === "map" ? "Step 3 of 5: Map columns"
    : step === "connect" ? `Step 2 of 5: Connect ${source ? PROVIDER_META[source as keyof typeof PROVIDER_META].label : ""}`
    : step === "configure" ? "Step 3 of 5: Select invoices"
    : step === "review" ? "Step 4 of 5: Review"
    : "Import complete";

  // ── CSV handlers ──────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!selectedFile) { setError("Please select a CSV file"); return; }
    setLoading(true); setError("");
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
    } catch { setError("Failed to upload file. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleMappingDone() {
    if (!selectedFile || !parseResult) return;
    const missing = SYSTEM_FIELDS.filter((f) => f.required && !mappings[f.key]);
    if (missing.length > 0) { setError(`Please map required fields: ${missing.map((f) => f.label).join(", ")}`); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("mappings", JSON.stringify(mappings));
      const res = await fetch("/api/invoices/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Mapping failed"); return; }
      const duplicates = await checkDuplicates(data.invoices.map((inv: ParsedInvoice) => ({
        invoiceNumber: inv.invoiceNumber, customerName: inv.customerName, invoiceDate: inv.invoiceDate,
      })));
      setReviewResult({ invoices: data.invoices, errors: data.errors, duplicates, totalLineItems: data.totalLineItems, sourceLabel: parseResult.fileName });
      setStep("review");
    } catch { setError("Failed to process mappings. Please try again."); }
    finally { setLoading(false); }
  }

  // ── Provider handlers ──────────────────────────────────────────────────────

  function handleConnect() {
    if (!source || source === "csv") return;
    setConnectStatus("connecting");
    const popup = window.open(
      `/api/integrations/${source}/auth`,
      `${source}-auth`,
      "width=620,height=700,left=200,top=100"
    );
    if (!popup) {
      setConnectStatus("error");
      setConnectMessage("Popup blocked. Please allow popups and try again.");
    }
  }

  async function handleDisconnect() {
    if (!source || source === "csv") return;
    setLoading(true);
    try {
      await disconnectIntegration(source as "freshbooks" | "quickbooks");
      setConnectStatus("idle");
      setConnectMessage("");
      const statuses = await getIntegrationStatuses();
      setIntegrationStatuses(statuses);
    } catch { setError("Failed to disconnect"); }
    finally { setLoading(false); }
  }

  async function handleFetchInvoices() {
    if (!source || source === "csv") return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/integrations/${source}/invoices?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to fetch invoices"); return; }
      const invoices: ParsedInvoice[] = data.invoices || [];
      if (invoices.length === 0) { setError("No invoices found for the selected date range."); return; }
      const duplicates = await checkDuplicates(invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber, customerName: inv.customerName, invoiceDate: inv.invoiceDate,
      })));
      const providerLabel = PROVIDER_META[source as keyof typeof PROVIDER_META].label;
      setReviewResult({
        invoices,
        errors: [],
        duplicates,
        totalLineItems: invoices.reduce((s, inv) => s + inv.lineItems.length, 0),
        sourceLabel: `${providerLabel} (${dateFrom} to ${dateTo})`,
      });
      setStep("review");
    } catch { setError("Failed to fetch invoices. Please try again."); }
    finally { setLoading(false); }
  }

  // ── Shared confirm import ──────────────────────────────────────────────────

  async function handleConfirmImport() {
    if (!reviewResult) return;
    setLoading(true); setError("");
    try {
      const invoicesToImport = ignoreDuplicates
        ? reviewResult.invoices
        : reviewResult.invoices.filter((inv) => !reviewResult.duplicates.some((d) => d.invoiceNumber === inv.invoiceNumber));
      if (invoicesToImport.length === 0) { setError("No invoices to import after excluding duplicates."); return; }
      const result = await saveImportedInvoices(invoicesToImport, reviewResult.sourceLabel, source || "csv");
      if (result.success) {
        setDoneResult({ invoiceCount: result.invoiceCount, lineItemCount: result.lineItemCount });
        setStep("done");
      }
    } catch { setError("Failed to save invoices. Please try again."); }
    finally { setLoading(false); }
  }

  function downloadTemplate() {
    const headers = SYSTEM_FIELDS.map((f) => f.label).join(",");
    const example = '"INV-1001","2026-04-20","Acme Corp","acme@example.com","555-1234","123 Main St","456 Job Site Rd","Install security cameras",4,200,800,"Rush job",3200';
    const blob = new Blob([headers + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "invoice-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Footer rendering ────────────────────────────────────────────────────────

  const footer = (
    <>
      {step === "source" && (
        <>
          <div />
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </>
      )}
      {step === "upload" && (
        <>
          <Btn variant="ghost" size="md" icon={<Icon.download />} onClick={downloadTemplate}>Download Template</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={() => { setStep("source"); setSource(null); }}>Back</Btn>
            <Btn variant="primary" onClick={handleUpload} disabled={!selectedFile || loading}>
              {loading ? "Uploading…" : "Continue"}
            </Btn>
          </div>
        </>
      )}
      {step === "map" && (
        <>
          <Btn variant="secondary" onClick={() => setStep("upload")}>Back</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleMappingDone} disabled={loading}>
              {loading ? "Processing…" : "Preview Import"}
            </Btn>
          </div>
        </>
      )}
      {step === "connect" && (
        <>
          <Btn variant="secondary" onClick={() => { setStep("source"); setSource(null); setConnectStatus("idle"); }}>Back</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn
              variant="primary"
              onClick={() => setStep("configure")}
              disabled={connectStatus !== "connected" && !getIntegrationStatus(source!)?.connected}
            >
              Continue
            </Btn>
          </div>
        </>
      )}
      {step === "configure" && (
        <>
          <Btn variant="secondary" onClick={() => setStep("connect")}>Back</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleFetchInvoices} disabled={loading}>
              {loading ? "Fetching…" : "Fetch Invoices"}
            </Btn>
          </div>
        </>
      )}
      {step === "review" && (
        <>
          <Btn variant="secondary" onClick={() => source === "csv" ? setStep("map") : setStep("configure")}>Back</Btn>
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
      )}
      {step === "done" && (
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="primary" onClick={onImported}>Done</Btn>
        </div>
      )}
    </>
  );

  return (
    <ModalShell title={title} subtitle={subtitle} stepIndex={Math.max(0, stepIndex)} stepCount={5} onClose={onClose} footer={footer}>
      {step === "source" && (
        <SourceStep
          source={source}
          setSource={setSource}
          onSelect={(s) => { setSource(s); setStep(s === "csv" ? "upload" : "connect"); }}
          integrationStatuses={integrationStatuses}
        />
      )}
      {step === "upload" && (
        <UploadStep
          file={selectedFile}
          dragOver={dragOver}
          setDragOver={setDragOver}
          fileInputRef={fileInputRef}
          onFileSelected={(f) => { setSelectedFile(f); setError(""); }}
          error={error}
        />
      )}
      {step === "map" && parseResult && (
        <MappingStep parseResult={parseResult} mappings={mappings} setMappings={setMappings} error={error} />
      )}
      {step === "connect" && source && source !== "csv" && (
        <ConnectStep
          source={source}
          status={connectStatus}
          message={connectMessage}
          existingConnection={getIntegrationStatus(source) || null}
          error={error}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      )}
      {step === "configure" && source && source !== "csv" && (
        <ConfigureStep
          source={source}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          error={error}
          loading={loading}
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

// ── Source selection ──────────────────────────────────────────────────────────

function SourceStep({
  source,
  setSource,
  onSelect,
  integrationStatuses,
}: {
  source: Source | null;
  setSource: (s: Source) => void;
  onSelect: (s: Source) => void;
  integrationStatuses: IntegrationStatus[];
}) {
  const getStatus = (provider: "freshbooks" | "quickbooks") =>
    integrationStatuses.find((s) => s.provider === provider);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
      <p style={{ fontSize: 13, color: "#6b6860", margin: 0 }}>
        Choose where to import invoices from. CSV works with any accounting software that can export data.
      </p>

      {/* CSV */}
      <SourceCard
        active={source === "csv"}
        onClick={() => onSelect("csv")}
        icon={
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f4f2ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.upload style={{ width: 18, height: 18, color: "#4a4740" }} />
          </div>
        }
        title="CSV File Upload"
        description="Upload a CSV export from any accounting platform. Map columns to our fields."
        badge={<span style={{ fontSize: 11, color: "#4a8a6e", background: "#e8f1ec", padding: "2px 8px", borderRadius: 999, fontWeight: 500 }}>Always available</span>}
      />

      {/* FreshBooks */}
      {renderProviderCard("freshbooks", source, onSelect, getStatus("freshbooks"))}
      {/* QuickBooks */}
      {renderProviderCard("quickbooks", source, onSelect, getStatus("quickbooks"))}
    </div>
  );
}

function renderProviderCard(
  provider: "freshbooks" | "quickbooks",
  selected: Source | null,
  onSelect: (s: Source) => void,
  status: IntegrationStatus | undefined
) {
  const meta = PROVIDER_META[provider];
  const connected = status?.connected;
  const configured = status?.configured;

  return (
    <SourceCard
      key={provider}
      active={selected === provider}
      onClick={() => onSelect(provider)}
      icon={
        <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: meta.color }}>
          {meta.logo}
        </div>
      }
      title={meta.label}
      description={meta.description}
      badge={
        connected ? (
          <span style={{ fontSize: 11, color: "#2f6848", background: "#e8f1ec", padding: "2px 8px", borderRadius: 999, fontWeight: 500 }}>
            ● Connected
          </span>
        ) : !configured ? (
          <span style={{ fontSize: 11, color: "#8a8780", background: "#f4f2ec", padding: "2px 8px", borderRadius: 999, fontWeight: 500 }}>
            Setup required
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "#8a5a1a", background: "#fef4e6", padding: "2px 8px", borderRadius: 999, fontWeight: 500 }}>
            Not connected
          </span>
        )
      }
    />
  );
}

function SourceCard({
  active, onClick, icon, title, description, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px", borderRadius: 12,
        border: active ? "2px solid #1a1814" : "1px solid #ecebe6",
        background: active ? "#faf8f4" : "#fff",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
        transition: "border-color 150ms, background 150ms",
      }}
    >
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</span>
          {badge}
        </div>
        <div style={{ fontSize: 12, color: "#6b6860", lineHeight: 1.4 }}>{description}</div>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        border: active ? "none" : "1.5px solid #dcd9d2",
        background: active ? "#1a1814" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
      </div>
    </div>
  );
}

// ── Connect step ──────────────────────────────────────────────────────────────

function ConnectStep({
  source, status, message, existingConnection, error, onConnect, onDisconnect,
}: {
  source: "freshbooks" | "quickbooks";
  status: "idle" | "connecting" | "connected" | "error";
  message: string;
  existingConnection: IntegrationStatus | null;
  error: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const meta = PROVIDER_META[source];
  const isConnected = status === "connected" || (existingConnection?.connected && status === "idle");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      {!isConnected ? (
        <>
          <div style={{ textAlign: "center", padding: "32px 24px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: meta.color, margin: "0 auto 16px" }}>
              {meta.logo}
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 6 }}>Connect to {meta.label}</div>
            <div style={{ fontSize: 13, color: "#6b6860", maxWidth: 380, margin: "0 auto" }}>
              You&apos;ll be taken to {meta.label} to authorize Galliano Works to read your invoices. No data is modified.
            </div>
          </div>

          {!existingConnection?.configured && (
            <div style={{ background: "#fef8e6", border: "1px solid #f0dea0", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8a5a1a", marginBottom: 4 }}>Integration not configured</div>
              <div style={{ fontSize: 12, color: "#6b4a14" }}>
                Set <code style={{ background: "#fff5d6", padding: "1px 5px", borderRadius: 3 }}>
                  {source === "freshbooks" ? "FRESHBOOKS_CLIENT_ID + FRESHBOOKS_CLIENT_SECRET" : "QUICKBOOKS_CLIENT_ID + QUICKBOOKS_CLIENT_SECRET"}
                </code> in your <code style={{ background: "#fff5d6", padding: "1px 5px", borderRadius: 3 }}>.env</code> file to enable this integration.
              </div>
            </div>
          )}

          {status === "connecting" && (
            <div style={{ background: "#eef2f7", border: "1px solid #c8d8ee", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#3b5378" }}>
              A popup window has opened. Complete authorization in that window…
            </div>
          )}
          {status === "error" && (
            <ErrorBanner message={message} />
          )}
          {error && <ErrorBanner message={error} />}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <Btn
              variant="primary"
              size="md"
              onClick={onConnect}
              disabled={!existingConnection?.configured || status === "connecting"}
            >
              {status === "connecting" ? "Waiting for authorization…" : `Connect ${meta.label}`}
            </Btn>
          </div>
        </>
      ) : (
        <div style={{ padding: "24px 0 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#e8f1ec", borderRadius: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: meta.color }}>
              {meta.logo}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#2f6848" }}>Connected to {meta.label}</div>
              <div style={{ fontSize: 12, color: "#4a6858", marginTop: 1 }}>
                {existingConnection?.displayName || message || "Ready to import"}
              </div>
            </div>
            <Icon.checkCircle style={{ color: "#2f6848", width: 20, height: 20 }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={onDisconnect} style={{ background: "none", border: "none", fontSize: 12, color: "#8a8780", cursor: "pointer", textDecoration: "underline" }}>
              Disconnect and use a different account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Configure step ────────────────────────────────────────────────────────────

function ConfigureStep({
  source, dateFrom, dateTo, setDateFrom, setDateTo, error, loading,
}: {
  source: "freshbooks" | "quickbooks";
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  error: string;
  loading: boolean;
}) {
  const meta = PROVIDER_META[source];

  const presets = [
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "Last 6 months", days: 180 },
    { label: "Last year", days: 365 },
  ];

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateTo(to.toISOString().slice(0, 10));
    setDateFrom(from.toISOString().slice(0, 10));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      <div style={{ fontSize: 13, color: "#6b6860" }}>
        Select the date range for invoices to import from <strong>{meta.label}</strong>.
        Only invoices within this range will be fetched.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {presets.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            style={{
              padding: "6px 12px", borderRadius: 999, fontSize: 12, fontFamily: "inherit",
              border: "1px solid #dcd9d2", background: "#fff", cursor: "pointer",
              color: "#4a4740",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ width: "100%", height: 36, borderRadius: 7, border: "1px solid #dcd9d2", padding: "0 10px", fontSize: 13, fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ width: "100%", height: 36, borderRadius: 7, border: "1px solid #dcd9d2", padding: "0 10px", fontSize: 13, fontFamily: "inherit" }}
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading && (
        <div style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "#8a8780" }}>
          Fetching invoices from {meta.label}…
        </div>
      )}
    </div>
  );
}

// ── CSV Upload step ───────────────────────────────────────────────────────────

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
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: file ? "#e8f1ec" : "#f4f2ec", display: "flex", alignItems: "center", justifyContent: "center", color: file ? "#2f6848" : "#8a8780" }}>
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
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }} />
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
              <span style={{ color: "#4a8a6e", flexShrink: 0 }}>✓</span> {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Column mapping step ───────────────────────────────────────────────────────

function MappingStep({ parseResult, mappings, setMappings, error }: {
  parseResult: ParseResult;
  mappings: FieldMapping;
  setMappings: (m: FieldMapping) => void;
  error: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      <div style={{ fontSize: 13, color: "#6b6860" }}>
        Found <strong>{parseResult.columns.length} columns</strong> and <strong>{parseResult.totalRows} data rows</strong> in <em>{parseResult.fileName}</em>.
      </div>
      {error && <ErrorBanner message={error} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid #f4f2ec" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.05em" }}>System Field</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.05em" }}>CSV Column</div>
        </div>
        {SYSTEM_FIELDS.map((sf) => (
          <div key={sf.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 0", alignItems: "center", borderBottom: "1px solid #f9f8f5" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {sf.label}{sf.required && <span style={{ color: "#a8442f", marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>{sf.description}</div>
            </div>
            <select
              value={mappings[sf.key] || ""}
              onChange={(e) => setMappings({ ...mappings, [sf.key]: e.target.value })}
              style={{ height: 32, borderRadius: 7, border: "1px solid #dcd9d2", padding: "0 8px", fontSize: 12.5, fontFamily: "inherit", background: "#fff" }}
            >
              <option value="">— not mapped —</option>
              {parseResult.columns.map((col) => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        ))}
      </div>
      {parseResult.preview.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8a8780", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Preview (first {parseResult.preview.length} rows)
          </div>
          <div style={{ overflowX: "auto", border: "1px solid #ecebe6", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#faf8f4" }}>
                  {parseResult.columns.map((col) => (
                    <th key={col} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", color: "#4a4740", borderBottom: "1px solid #ecebe6" }}>{col}</th>
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

// ── Review step ───────────────────────────────────────────────────────────────

function ReviewStep({ result, ignoreDuplicates, setIgnoreDuplicates, error }: {
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
      {result.sourceLabel && (
        <div style={{ fontSize: 12, color: "#8a8780", padding: "0 2px" }}>
          Source: <strong style={{ color: "#4a4740" }}>{result.sourceLabel}</strong>
        </div>
      )}
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
            <input type="checkbox" checked={ignoreDuplicates} onChange={(e) => setIgnoreDuplicates(e.target.checked)} style={{ width: 14, height: 14 }} />
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
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < Math.min(result.invoices.length, 8) - 1 ? "1px solid #f4f2ec" : "none", display: "flex", alignItems: "center", gap: 10, opacity: skip ? 0.5 : 1 }}>
                  {skip ? <span style={{ color: "#d89538" }}>⚠</span> : <Icon.checkCircle style={{ color: "#2f6848", flexShrink: 0 }} />}
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

// ── Done step ─────────────────────────────────────────────────────────────────

function DoneStep({ result }: { result: { invoiceCount: number; lineItemCount: number } }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 16, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e8f1ec", display: "flex", alignItems: "center", justifyContent: "center", color: "#2f6848" }}>
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
    <div style={{ background: "#fbeee9", border: "1px solid #f0c8b8", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#a8442f" }}>
      {message}
    </div>
  );
}
