"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RequestItem = {
  id: number;
  title: string;
  status: string;
  priority: string;
  category_name?: string;
  requester_name?: string;
  created_at?: string;
};

type DashboardStats = {
  totals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    revision: number;
    today: number;
    approvalRate: number;
  };
  byCategory: { name: string; count: number }[];
  weekly: { label: string; count: number }[];
};

export default function DashboardPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      if (!token || !u) {
        router.push("/login");
        return;
      }
      setUser(JSON.parse(u));

      const [requestsRes, statsRes] = await Promise.all([
        fetch("/api/requests", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/dashboard-stats", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (requestsRes.ok) setRequests(await requestsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    };
    fetchDashboard();
  }, [router]);

  if (!user) return null;

  const maxCategory = Math.max(...(stats?.byCategory.map((item) => item.count) || [1]), 1);
  const maxWeekly = Math.max(...(stats?.weekly.map((item) => item.count) || [1]), 1);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-sm mb-lg">
        <div>
          <h1 className="text-title-lg md:text-display-md font-medium">
            {user.role === "requester" ? "My Requests" : user.role === "approver" ? "Approval Queue" : user.role === "it_support" ? "IT Support Queue" : "Admin Dashboard"}
          </h1>
          <p className="text-muted text-body-md mt-xs">Ringkasan status request dan aktivitas approval.</p>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-sm md:gap-md mb-lg">
            <div className="bg-surface-dark text-on-dark p-md rounded-lg">
              <p className="text-body-md opacity-80">Total</p>
              <p className="text-display-md font-medium">{stats.totals.total}</p>
            </div>
            <div className="bg-signature-cream text-ink p-md rounded-lg">
              <p className="text-body-md text-muted">Pending</p>
              <p className="text-display-md font-medium">{stats.totals.pending}</p>
            </div>
            <div className="bg-signature-mint text-ink p-md rounded-lg">
              <p className="text-body-md text-muted">Approved</p>
              <p className="text-display-md font-medium">{stats.totals.approved}</p>
            </div>
            <div className="bg-signature-peach text-ink p-md rounded-lg">
              <p className="text-body-md text-muted">Rejected</p>
              <p className="text-display-md font-medium">{stats.totals.rejected}</p>
            </div>
            <div className="bg-canvas border border-hairline p-md rounded-lg col-span-2 lg:col-span-1">
              <p className="text-body-md text-muted">Approval Rate</p>
              <p className="text-display-md font-medium text-ink">{stats.totals.approvalRate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md mb-lg">
            <div className="bg-canvas border border-hairline rounded-md p-md">
              <h2 className="text-title-sm font-medium mb-md">Request per Kategori</h2>
              <div className="space-y-sm">
                {stats.byCategory.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-body-md mb-xs">
                      <span>{item.name}</span>
                      <span className="font-medium text-ink">{item.count}</span>
                    </div>
                    <div className="h-[10px] bg-surface-strong rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-canvas border border-hairline rounded-md p-md">
              <h2 className="text-title-sm font-medium mb-md">Tren 7 Hari Terakhir</h2>
              <div className="h-[220px] flex items-end gap-sm border-b border-hairline pb-sm">
                {stats.weekly.map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-xs">
                    <div className="text-xs text-muted">{item.count}</div>
                    <div
                      className="w-full max-w-[48px] bg-signature-forest rounded-t-md min-h-[6px]"
                      style={{ height: `${Math.max((item.count / maxWeekly) * 170, 6)}px` }}
                    />
                    <div className="text-xs text-muted">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-canvas border border-hairline rounded-md p-md overflow-x-auto">
        <h2 className="text-title-sm font-medium mb-md">Daftar Request</h2>
        {requests.length === 0 ? (
          <p className="text-muted text-body-md">Tidak ada data untuk ditampilkan.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="border-b border-hairline">
                <th className="py-sm px-xs font-medium text-label-md">ID</th>
                <th className="py-sm px-xs font-medium text-label-md">Judul</th>
                <th className="py-sm px-xs font-medium text-label-md">Status</th>
                <th className="py-sm px-xs font-medium text-label-md">Prioritas</th>
                <th className="py-sm px-xs font-medium text-label-md">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="border-b border-hairline hover:bg-surface-soft cursor-pointer"
                  onClick={() => router.push(`/dashboard/requests/${req.id}`)}
                >
                  <td className="py-sm px-xs text-body-md">{req.id}</td>
                  <td className="py-sm px-xs text-body-md font-medium text-ink">{req.title}</td>
                  <td className="py-sm px-xs text-body-md">
                    <span className="inline-block px-xs py-[2px] rounded-xs bg-surface-strong text-ink text-xs uppercase">{req.status}</span>
                  </td>
                  <td className="py-sm px-xs text-body-md capitalize">{req.priority}</td>
                  <td className="py-sm px-xs text-body-md whitespace-nowrap">{req.created_at ? new Date(req.created_at).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
