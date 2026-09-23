"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Email atau password salah.");
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas">
      <div className="w-full max-w-md px-lg py-xl bg-canvas rounded-md border border-hairline shadow-sm">
        <div className="text-center mb-lg">
          <h1 className="text-display-md font-medium text-ink">SIAGA</h1>
          <p className="text-body-md text-muted mt-xs">Smart Internal Approval & Ticketing System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-md">
          {error && (
            <div className="p-sm bg-signature-coral text-on-primary rounded-sm text-body-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-label-md text-ink mb-xs">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-[44px] px-[16px] bg-canvas text-ink text-body-md rounded-sm border border-hairline focus:outline-none focus:border-info-border"
              placeholder="email@cimb.co.id"
            />
          </div>

          <div>
            <label className="block text-label-md text-ink mb-xs">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-[44px] px-[16px] bg-canvas text-ink text-body-md rounded-sm border border-hairline focus:outline-none focus:border-info-border"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[16px] px-[24px] bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-active transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
