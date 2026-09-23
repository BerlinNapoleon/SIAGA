"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  name: string;
  description: string | null;
  requires_levels: number;
  is_active: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', requires_levels: 1 });
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/admin/categories", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setCategories(await res.json());
    } else if (res.status === 401) {
      router.push("/login");
    }
    setLoading(false);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ name: '', description: '', requires_levels: 1 });
        setShowForm(false);
        await fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error || "Gagal membuat kategori");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (categoryId: number, currentStatus: boolean) => {
    if (!window.confirm(`Apakah Anda yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} kategori ini?`)) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        await fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error || "Gagal mengubah status kategori");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    }
  };

  return (
    <div className="space-y-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-xs">Admin Panel</p>
          <h1 className="text-title-lg md:text-display-md font-medium">Manajemen Kategori</h1>
          <p className="text-muted text-body-md mt-xs">Kelola tipe request dan approval level.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="erp-button-primary w-full md:w-auto"
        >
          ➕ Kategori Baru
        </button>
      </div>

      {showForm && (
        <div className="erp-card p-lg">
          <h2 className="text-title-md font-medium mb-md">Buat Kategori Baru</h2>
          <form onSubmit={handleCreateCategory} className="space-y-md">
            <div>
              <label className="erp-label">Nama Kategori *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="erp-input"
                placeholder="Contoh: Perubahan Akses Sistem"
              />
            </div>
            <div>
              <label className="erp-label">Deskripsi (Opsional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="erp-textarea"
                placeholder="Jelaskan tipe request ini"
              />
            </div>
            <div>
              <label className="erp-label">Jumlah Level Approval *</label>
              <div className="flex gap-lg">
                {[1, 2].map((level) => (
                  <label key={level} className="flex items-center gap-xs cursor-pointer">
                    <input
                      type="radio"
                      name="requires_levels"
                      value={level}
                      checked={formData.requires_levels === level}
                      onChange={(e) => setFormData({ ...formData, requires_levels: parseInt(e.target.value) })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-body-md">{level} Level</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-md">
              <button
                type="submit"
                disabled={loading}
                className="erp-button-primary"
              >
                {loading ? 'Membuat...' : 'Buat Kategori'}
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
          <h2 className="text-title-sm font-medium">Daftar Kategori ({categories.length})</h2>
        </div>
        {categories.length === 0 ? (
          <div className="erp-card-body text-muted text-body-md">Tidak ada kategori.</div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Deskripsi</th>
                <th>Level Approval</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="font-medium text-ink">{cat.name}</td>
                  <td className="text-body-md">{cat.description || '-'}</td>
                  <td><span className="px-xs py-[2px] bg-surface-soft rounded-xs text-xs font-medium">{cat.requires_levels} Level</span></td>
                  <td>
                    <span className={`px-xs py-[2px] rounded-xs text-xs font-medium ${cat.is_active ? 'bg-success/20 text-success-border' : 'bg-[#fdecea] text-[#9f2a22]'}`}>
                      {cat.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(cat.id, cat.is_active)}
                      className="text-link text-body-md hover:underline"
                    >
                      {cat.is_active ? 'Nonaktifkan' : 'Aktifkan'}
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
