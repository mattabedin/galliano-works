import { ReactNode, CSSProperties } from "react";

export function Card({
  children,
  style,
  pad = 20,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ecebe6",
        borderRadius: 12,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: "#ecebe6" }} />;
}
