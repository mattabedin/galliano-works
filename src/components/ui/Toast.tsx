"use client";

import { useState, useCallback, ReactNode } from "react";
import { Icon } from "./Icons";

interface ToastState {
  msg: string;
  kind: "info" | "success";
  id: number;
}

export function useToast(): [ReactNode, (msg: string, kind?: "info" | "success") => void] {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((msg: string, kind: "info" | "success" = "info") => {
    const id = Date.now();
    setToast({ msg, kind, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600);
  }, []);

  const node = toast ? (
    <div style={{
      position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "#1a1814", color: "#fafaf8", padding: "10px 16px",
      borderRadius: 10, fontSize: 13, fontWeight: 500,
      boxShadow: "0 12px 40px rgba(0,0,0,0.25)", zIndex: 80,
      display: "flex", alignItems: "center", gap: 8,
      animation: "toast-in 200ms ease-out", whiteSpace: "nowrap",
    }}>
      {toast.kind === "success" && <Icon.check style={{ color: "#7fd19f" }} />}
      {toast.msg}
    </div>
  ) : null;

  return [node, show];
}
