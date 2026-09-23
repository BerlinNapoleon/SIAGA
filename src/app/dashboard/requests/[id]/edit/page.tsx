"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditRequestPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [leaveDate, setLeaveDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchDetail = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/requests/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status !== 'revision') {
          alert('Hanya request dengan status revisi yang bisa diubah.');
          router.push('/dashboard');
          return;
        }
        setRequest(data);
        setTitle(data.title);
        setDescription(data.description);
        setPriority(data.priority);
        if (data.leave_date) {
          setLeaveDate(data.leave_date.split('T')[0]);
        }
      }
    };
    fetchDetail();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("priority", priority);
      if (leaveDate) {
        formData.append("leave_date", leaveDate);
      }
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(`/api/requests/${params.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        router.push(`/dashboard/requests/${params.id}`);
      } else {
        alert("Gagal menyimpan revisi request");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!request) return <div className="p-xl">Loading...</div>;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateString = tomorrow.toISOString().split("T")[0];

  return (
    <div className="max-w-2xl">
      <div className="mb-md">
        <Link href={`/dashboard/requests/${params.id}`} className="text-link text-body-md hover:underline">← Batal & Kembali</Link>
      </div>
      <div className="mb-lg border-b border-hairline pb-sm">
        <h1 className="text-title-lg font-medium">🔄 Revisi Request #{request.id}</h1>
        <p className="text-muted mt-xs">Kategori: {request.category_name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-md">
        {request.category_name.toLowerCase().includes("cuti") && (
          <div>
            <label className="block text-label-md mb-xs">Tanggal Cuti *</label>
            <input
              type="date"
              required
              min={minDateString}
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full h-[44px] px-[16px] bg-canvas text-ink text-body-md rounded-sm border border-hairline focus:outline-none focus:border-info-border"
            />
          </div>
        )}

        <div>
          <label className="block text-label-md mb-xs">Judul Request *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-[44px] px-[16px] bg-canvas text-ink text-body-md rounded-sm border border-hairline focus:outline-none focus:border-info-border"
          />
        </div>

        <div>
          <label className="block text-label-md mb-xs">Deskripsi / Justifikasi *</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-[16px] min-h-[120px] bg-canvas text-ink text-body-md rounded-sm border border-hairline focus:outline-none focus:border-info-border"
          />
        </div>

        <div>
          <label className="block text-label-md mb-xs">Prioritas *</label>
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
          <label className="block text-label-md mb-xs">Lampiran</label>
          {request.attachments && request.attachments.length > 0 && (
            <div className="mb-sm bg-surface-soft border border-hairline rounded-sm p-sm">
              <p className="text-body-md text-muted mb-xs">Lampiran saat ini:</p>
              <div className="flex flex-col gap-xs">
                {request.attachments.map((att: any) => (
                  <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-link text-body-md hover:underline">
                    {att.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}
          <input
            type="file"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="w-full text-body-md"
          />
          <p className="text-xs text-muted mt-xs">Kosongkan jika lampiran tidak berubah. Jika memilih file baru, semua lampiran sebelumnya akan dihapus dan diganti file ini.</p>
        </div>

        <div className="pt-sm">
          <button
            type="submit"
            disabled={loading}
            className="py-[16px] px-[24px] bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-active transition-colors disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Resubmit Request →"}
          </button>
        </div>
      </form>
    </div>
  );
}
