"use client";

import { useEffect, useState } from "react";

type AuditLog = {
  id: number;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  target_type: string | null;
  target_id: number | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/audit-logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setLogs(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportCsv = () => {
    const headers = ["Waktu", "Aktor", "Email", "Aksi", "Target", "IP", "Deskripsi"];
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString(),
      log.actor_name || "System",
      log.actor_email || "-",
      log.action_type,
      `${log.target_type || "-"}#${log.target_id || "-"}`,
      log.ip_address || "-",
      log.description || "-",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md mb-lg">
        <div>
          <h1 className="text-title-lg font-medium">Audit Trail</h1>
          <p className="text-muted text-body-md mt-xs">Log aktivitas immutable untuk kebutuhan compliance.</p>
        </div>
        <button onClick={exportCsv} className="py-sm px-md bg-primary text-on-primary rounded-lg font-medium w-full md:w-auto">
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-sm bg-surface-soft border border-hairline rounded-md p-md mb-lg">
        <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Cari aktor" className="h-[44px] px-sm rounded-sm border border-hairline text-body-md" />
        <select value={action} onChange={(e) => setAction(e.target.value)} className="h-[44px] px-sm rounded-sm border border-hairline text-body-md">
          <option value="">Semua aksi</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="CREATE_REQUEST">CREATE_REQUEST</option>
          <option value="UPDATE_REQUEST">UPDATE_REQUEST</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="REVISION_NEEDED">REVISION_NEEDED</option>
          <option value="IT_SUPPORT_RESOLVE">IT_SUPPORT_RESOLVE</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-[44px] px-sm rounded-sm border border-hairline text-body-md" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-[44px] px-sm rounded-sm border border-hairline text-body-md" />
        <button onClick={fetchLogs} disabled={loading} className="h-[44px] px-md bg-primary text-on-primary rounded-lg font-medium disabled:opacity-50">
          {loading ? "Loading..." : "Filter"}
        </button>
      </div>

      <div className="border border-hairline rounded-md overflow-x-auto bg-canvas">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead className="bg-surface-soft">
            <tr className="border-b border-hairline">
              <th className="py-sm px-sm font-medium text-label-md">Waktu</th>
              <th className="py-sm px-sm font-medium text-label-md">Aktor</th>
              <th className="py-sm px-sm font-medium text-label-md">Aksi</th>
              <th className="py-sm px-sm font-medium text-label-md">Target</th>
              <th className="py-sm px-sm font-medium text-label-md">IP</th>
              <th className="py-sm px-sm font-medium text-label-md">Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-hairline">
                <td className="py-sm px-sm text-body-md whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                <td className="py-sm px-sm text-body-md">{log.actor_name || "System"}</td>
                <td className="py-sm px-sm text-body-md"><span className="px-xs py-[2px] bg-surface-strong rounded-xs text-xs">{log.action_type}</span></td>
                <td className="py-sm px-sm text-body-md">{log.target_type || "-"}#{log.target_id || "-"}</td>
                <td className="py-sm px-sm text-body-md">{log.ip_address || "-"}</td>
                <td className="py-sm px-sm text-body-md">{log.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
