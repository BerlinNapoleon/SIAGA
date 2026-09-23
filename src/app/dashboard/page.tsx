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

const statusClass = (status: string) => {
  if (status === "approved") return "erp-badge erp-badge-approved";
  if (status === "rejected") return "erp-badge erp-badge-rejected";
  if (status === "revision") return "erp-badge erp-badge-revision";
  return "erp-badge erp-badge-pending";
};

export default function DashboardPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
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

      const [requestsRes, statsRes, categoriesRes] = await Promise.all([
        fetch(`/api/requests?status=${filterStatus}&category=${filterCategory}&sort=${sortBy}&page=${page}&pageSize=${pageSize}`, 
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/dashboard-stats", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.items || []);
        setTotalItems(data.total || 0);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    };
    fetchDashboard();
  }, [router, filterStatus, filterCategory, sortBy, page, pageSize]);

  if (!user) return null;

  const maxCategory = Math.max(...(stats?.byCategory.map((item) => item.count) || [1]), 1);
  const maxWeekly = Math.max(...(stats?.weekly.map((item) => item.count) || [1]), 1);
  const title = user.role === "requester" ? "My Requests" : user.role === "approver" ? "Approval Queue" : user.role === "it_support" ? "IT Support Queue" : "Executive Dashboard";
  
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-lg">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-sm">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-xs">SIAGA Workspace</p>
          <h1 className="text-title-lg md:text-display-md font-medium">{title}</h1>
          <p className="text-muted text-body-md mt-xs">Monitor request, approval status, dan operational throughput.</p>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-sm md:gap-md">
            {[
              { label: "Total Request", value: stats.totals.total, accent: "bg-primary text-on-primary" },
              { label: "Pending", value: stats.totals.pending, accent: "bg-white text-ink" },
              { label: "Approved", value: stats.totals.approved, accent: "bg-white text-ink" },
              { label: "Rejected", value: stats.totals.rejected, accent: "bg-white text-ink" },
              { label: "Approval Rate", value: `${stats.totals.approvalRate}%`, accent: "bg-white text-ink" },
            ].map((item) => (
              <div key={item.label} className={`erp-card p-md ${item.accent}`}>
                <p className={`text-body-md ${item.accent.includes("primary") ? "text-white/75" : "text-muted"}`}>{item.label}</p>
                <p className="text-display-md font-medium mt-xs">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
            <div className="erp-card">
              <div className="erp-card-header">
                <h2 className="text-title-sm font-medium">Request per Kategori</h2>
                <span className="text-xs text-muted">Distribution</span>
              </div>
              <div className="erp-card-body space-y-sm">
                {stats.byCategory.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-body-md mb-xs">
                      <span className="text-ink">{item.name}</span>
                      <span className="font-medium text-ink">{item.count}</span>
                    </div>
                    <div className="h-[9px] bg-[#eef0f4] rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="erp-card">
              <div className="erp-card-header">
                <h2 className="text-title-sm font-medium">Tren 7 Hari Terakhir</h2>
                <span className="text-xs text-muted">Volume</span>
              </div>
              <div className="erp-card-body">
                <div className="h-[220px] flex items-end gap-sm border-b border-[#eef0f4] pb-sm">
                  {stats.weekly.map((item) => (
                    <div key={item.label} className="flex-1 flex flex-col items-center gap-xs">
                      <div className="text-xs text-muted">{item.count}</div>
                      <div className="w-full max-w-[48px] bg-primary rounded-t-md min-h-[6px]" style={{ height: `${Math.max((item.count / maxWeekly) * 170, 6)}px` }} />
                      <div className="text-xs text-muted">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="erp-table-wrap">
        <div className="erp-card-header">
          <div>
            <h2 className="text-title-sm font-medium">Daftar Request</h2>
            <p className="text-body-md text-muted mt-[2px]">Klik baris untuk membuka detail transaksi.</p>
          </div>
        </div>

        <div className="p-md border-b border-[#eef0f4] bg-surface-soft space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
            <div>
              <label className="block text-xs text-muted font-medium mb-xs">Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="erp-input text-sm"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revision">Revision</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-xs">Filter Kategori</label>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                className="erp-input text-sm"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-xs">Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="erp-input text-sm"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="priority-high">Prioritas Tinggi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-xs">Per Halaman</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                className="erp-input text-sm"
              >
                <option value="10">10 items</option>
                <option value="25">25 items</option>
                <option value="50">50 items</option>
              </select>
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="erp-card-body text-muted text-body-md">Tidak ada data untuk ditampilkan.</div>
        ) : (
          <>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Judul</th>
                  <th>Status</th>
                  <th>Prioritas</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/requests/${req.id}`)}>
                    <td>#{req.id}</td>
                    <td className="font-medium text-ink">{req.title}</td>
                    <td><span className={statusClass(req.status)}>{req.status}</span></td>
                    <td className="capitalize">{req.priority}</td>
                    <td className="whitespace-nowrap">{req.created_at ? new Date(req.created_at).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="p-md border-t border-[#eef0f4] flex items-center justify-between">
                <div className="text-xs text-muted">
                  Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} dari {totalItems} request
                </div>
                <div className="flex gap-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="erp-button-secondary disabled:opacity-50"
                  >
                    ← Sebelumnya
                  </button>
                  <div className="flex items-center gap-xs text-body-md text-muted">
                    Hal {page} dari {totalPages}
                  </div>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="erp-button-secondary disabled:opacity-50"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
