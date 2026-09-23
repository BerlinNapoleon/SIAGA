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
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] bg-[#f5f7fb]">
      <section className="hidden lg:flex flex-col justify-between p-xxl bg-primary text-on-primary">
        <div className="flex items-center gap-sm">
          <div className="w-11 h-11 rounded-lg bg-white text-primary flex items-center justify-center font-medium text-title-sm">S</div>
          <div>
            <div className="text-title-sm font-medium">SIAGA</div>
            <div className="text-body-md opacity-70">Smart Internal Approval ERP</div>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-body-md opacity-70 mb-sm uppercase tracking-wide">CIMB Internal Operations</p>
          <h1 className="text-[52px] leading-[1.05] font-medium text-white mb-md">Approval workflow yang compliance-ready.</h1>
          <p className="text-title-md text-white/75 leading-relaxed">Maker-checker, audit trail, ticketing IT, dan monitoring approval dalam satu workspace profesional.</p>
        </div>

        <div className="grid grid-cols-3 gap-sm">
          <div className="bg-white/10 border border-white/15 rounded-lg p-md">
            <div className="text-title-lg text-white">RBAC</div>
            <div className="text-body-md text-white/70">Segregation of duties</div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-lg p-md">
            <div className="text-title-lg text-white">Audit</div>
            <div className="text-body-md text-white/70">Immutable activity log</div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-lg p-md">
            <div className="text-title-lg text-white">SLA</div>
            <div className="text-body-md text-white/70">Operational visibility</div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-md md:p-xl">
        <div className="w-full max-w-[460px] erp-card">
          <div className="erp-card-body p-xl">
            <div className="mb-lg">
              <div className="lg:hidden w-11 h-11 rounded-lg bg-primary text-on-primary flex items-center justify-center font-medium text-title-sm mb-md">S</div>
              <h2 className="text-display-md font-medium text-ink">Welcome back</h2>
              <p className="text-body-md text-muted mt-xs">Masuk untuk mengelola approval dan ticketing internal.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-md">
              {error && (
                <div className="p-sm bg-[#fdecea] text-[#9f2a22] rounded-md text-body-md border border-[#f6c9c5]">
                  {error}
                </div>
              )}

              <div>
                <label className="erp-label">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="erp-input" placeholder="email@siaga.local" />
              </div>

              <div>
                <label className="erp-label">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="erp-input" placeholder="••••••••" />
              </div>

              <button type="submit" disabled={loading} className="erp-button-primary w-full">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-lg p-sm rounded-md bg-surface-soft border border-[#e6e8ee] text-body-md text-muted">
              Demo: admin@siaga.local / password
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
