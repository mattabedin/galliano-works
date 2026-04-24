import { Sub } from "@/lib/types";

export function Avatar({ sub, size = 24 }: { sub: Sub | null; size?: number }) {
  if (!sub) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#e8e6e1", color: "#9a968e",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 600,
        border: "1px dashed #c8c5be", flexShrink: 0,
      }}>?</div>
    );
  }
  return (
    <div title={sub.name} style={{
      width: size, height: size, borderRadius: "50%",
      background: sub.color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600, letterSpacing: "0.01em",
      flexShrink: 0,
    }}>{sub.initials}</div>
  );
}
