import { Status, STATUS_META } from "@/lib/types";

export function StatusPill({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const meta = STATUS_META[status] || STATUS_META.unassigned;
  const sm = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: sm ? "2px 7px" : "3px 9px",
      borderRadius: 999, background: meta.bg, color: meta.fg,
      fontSize: sm ? 10.5 : 11.5, fontWeight: 500, letterSpacing: "0.01em",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
      {meta.label}
    </span>
  );
}
