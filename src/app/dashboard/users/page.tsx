"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  is_active: boolean;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'requester', department: '' });
  const [tempPassword, setTempPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setUsers(await res.json());
    } else if (res.status === 401) {
      router.push("/login");
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setTempPassword(data.temporaryPassword);
        setFormData({ name: '', email: '', role: 'requester', department: '' });
        setShowForm(false);
        await fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Gagal membuat user");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    if (!window.confirm(`Apakah Anda yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} user ini?`)) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        await fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Gagal mengubah status user");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      'requester': 'Requester',
      'approver': 'Approver',
      'it_support': 'IT Support',
      'admin': 'Admin'
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-xs">Admin Panel</p>
          <h1 className="text-title-lg md:text-display-md font-medium">Manajemen User</h1>
          <p className="text-muted text-body-md mt-xs">Kelola akun user, role, dan akses sistem.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="erp-button-primary w-full md:w-auto"
        >
          ➕ Buat User Baru
        </button>
      </div>

      {tempPassword && (
        <div className="bg-success/10 border border-success p-lg rounded-lg">
          <p className="text-body-md font-medium text-success mb-md">✅ User berhasil dibuat!</p>
          <p className="text-body-md text-muted mb-md">Password sementara (harap dicatat dan ubah saat login pertama):</p>
          <div className="bg-white p-sm rounded-md border border-success font-mono text-sm mb-md">
            {tempPassword}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(tempPassword);
              alert('Password disalin ke clipboard');
            }}
            className="text-link text-body-md hover:underline"
          >
            📋 Salin ke Clipboard
          </button>
        </div>
      )}

      {showForm && (
        <div className="erp-card p-lg">
          <h2 className="text-title-md font-medium mb-md">Buat User Baru</h2>
          <form onSubmit={handleCreateUser} className="space-y-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div>
                <label className="erp-label">Nama *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="erp-input"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="erp-label">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="erp-input"
                  placeholder="email@siaga.local"
                />
              </div>
              <div>
                <label className="erp-label">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="erp-input"
                >
                  <option value="requester">Requester</option>
                  <option value="approver">Approver</option>
                  <option value="it_support">IT Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="erp-label">Departemen (Opsional)</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="erp-input"
                  placeholder="Misal: Engineering, Finance"
                />
              </div>
            </div>
            <div className="flex gap-md">
              <button
                type="submit"
                disabled={loading}
                className="erp-button-primary"
              >
                {loading ? 'Membuat...' : 'Buat User'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="erp-button-secondary"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="erp-table-wrap">
        <div className="erp-card-header">
          <h2 className="text-title-sm font-medium">Daftar User ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <div className="erp-card-body text-muted text-body-md">Tidak ada user.</div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Departemen</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-ink">{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="px-xs py-[2px] bg-surface-soft rounded-xs text-xs font-medium">{getRoleLabel(u.role)}</span></td>
                  <td>{u.department || '-'}</td>
                  <td>
                    <span className={`px-xs py-[2px] rounded-xs text-xs font-medium ${u.is_active ? 'bg-success/20 text-success-border' : 'bg-[#fdecea] text-[#9f2a22]'}`}>
                      {u.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className="text-link text-body-md hover:underline"
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
