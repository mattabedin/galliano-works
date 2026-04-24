"use client";

import { useState, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, { h: number; px: number; fs: number }> = {
  sm: { h: 26, px: 10, fs: 12 },
  md: { h: 32, px: 12, fs: 13 },
  lg: { h: 40, px: 16, fs: 14 },
};

const variants: Record<Variant, { bg: string; fg: string; border: string; hover: string }> = {
  primary:  { bg: "#1a1814", fg: "#fafaf8", border: "1px solid #1a1814",   hover: "#2a2620" },
  secondary:{ bg: "#fff",    fg: "#1a1814", border: "1px solid #dcd9d2",   hover: "#f6f4ef" },
  ghost:    { bg: "transparent", fg: "#4a4740", border: "1px solid transparent", hover: "#f0ede6" },
  success:  { bg: "#2f6848", fg: "#fff",    border: "1px solid #2f6848",   hover: "#24563a" },
  danger:   { bg: "#fff",    fg: "#a8442f", border: "1px solid #e7c9c0",   hover: "#fbeee9" },
};

interface BtnProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
}

export function Btn({
  variant = "primary",
  size = "md",
  icon,
  children,
  onClick,
  disabled,
  style,
  type = "button",
}: BtnProps) {
  const [hovered, setHovered] = useState(false);
  const s = sizes[size];
  const v = variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        fontSize: s.fs,
        fontWeight: 500,
        letterSpacing: "0.002em",
        borderRadius: 8,
        border: v.border,
        background: disabled ? "#ededea" : hovered ? v.hover : v.bg,
        color: disabled ? "#a8a49c" : v.fg,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        transition: "background 120ms, color 120ms",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
