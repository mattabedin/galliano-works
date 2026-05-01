"use client";

import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/screens/LoginScreen";

const ACCENT = "#c94a2a";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (role: "admin" | "subcontractor") => {
    localStorage.setItem("galliano-auth", "true");
    localStorage.setItem("galliano-role", role);
    router.push(role === "subcontractor" ? "/mobile" : "/dashboard");
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <LoginScreen accent={ACCENT} onLogin={handleLogin} />
    </div>
  );
}
