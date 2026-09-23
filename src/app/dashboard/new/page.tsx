"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  name: string;
  requires_levels: number;
};

export default function NewRequestPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [leaveDate, setLeaveDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id.toString());
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("category_id", categoryId);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("priority", priority);
      if (leaveDate) {
        formData.append("leave_date", leaveDate);
      }
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        alert("Gagal membuat request");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id.toString() === categoryId);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateString = tomorrow.toISOString().split("T")[0];

  return (
    <div className="max-w-3xl erp-card">
      <div className="erp-card-header">
        <div>
          <h1 className="text-title-lg font-medium">New Request</h1>
          <p className="text-body-md text-muted mt-[2px]">Ajukan request internal untuk diproses sesuai workflow.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="erp-card-body space-y-md">
        <div>
          <label className="erp-label">Kategori *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="erp-input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <p className="text-body-md text-info mt-xs">
              ℹ Kategori ini memerlukan {selectedCategory.requires_levels} level approval.
            </p>
          )}
        </div>

        {selectedCategory && selectedCategory.name.toLowerCase().includes("cuti") && (
          <div>
            <label className="erp-label">Tanggal Cuti *</label>
            <input
              type="date"
              required
              min={minDateString}
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="erp-input"
            />
          </div>
        )}

        <div>
          <label className="erp-label">Judul Request *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Permohonan Akses VPN Dev Environment"
            className="erp-input"
          />
        </div>

        <div>
          <label className="erp-label">Deskripsi / Justifikasi *</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="erp-textarea"
          />
        </div>

        <div>
          <label className="erp-label">Prioritas *</label>
          <div className="flex gap-lg">
            {["low", "medium", "high"].map((p) => (
              <label key={p} className="flex items-center gap-xs cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="capitalize text-body-md">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="erp-label">Lampiran Dokumen (Opsional)</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="w-full text-body-md"
          />
        </div>

        <div className="pt-sm">
          <button
            type="submit"
            disabled={loading}
            className="erp-button-primary"
          >
            {loading ? "Menyimpan..." : "Submit Request →"}
          </button>
        </div>
      </form>
    </div>
  );
}
