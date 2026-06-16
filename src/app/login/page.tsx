"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/screens/LoginScreen";

const ACCENT = "#c94a2a";

const CREDENTIALS = [
  { email: "jolene@beletage.com", password: "BE#9xMp2026", role: "admin" as const },
  { email: "marcus@beletage.com", password: "BE#9xMp2026", role: "supervisor" as const },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleLogin = (role: "admin" | "supervisor" | "subcontractor", email: string, password: string) => {
    const match = CREDENTIALS.find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
    );

    if (!match) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    setError("");
    localStorage.setItem("galliano-auth", "true");
    localStorage.setItem("galliano-role", match.role);
    router.push("/dashboard");
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <LoginScreen accent={ACCENT} error={error} onLogin={handleLogin} />
    </div>
  );
}
