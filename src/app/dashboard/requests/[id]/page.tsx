"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDetail = async () => {
      const token = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));

      const res = await fetch(`/api/requests/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequest(data);
        if (data.attachments?.length > 0) {
          setSelectedAttachment(data.attachments[0]);
        }
      }
    };
    fetchDetail();
  }, [params.id]);

  const handleAction = async (action: string) => {
    if ((action === 'rejected' || action === 'revision_needed') && !notes) {
      alert('Catatan wajib diisi untuk penolakan atau revisi.');
      return;
    }
    
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/requests/${params.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, notes })
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        alert("Gagal memproses approval.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportResolve = async () => {
    if (!notes) {
      alert('Catatan penyelesaian wajib diisi.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("notes", notes);
    if (supportFile) {
      formData.append("file", supportFile);
    }

    try {
      const res = await fetch(`/api/requests/${params.id}/support-resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        alert("Gagal menyelesaikan tiket IT Support.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!request || !user) return <div className="p-xl">Loading...</div>;

  const canApprove = user.role === 'approver' && ['pending', 'in_review'].includes(request.status);
  const canSupportResolve = user.role === 'it_support' && request.category_name === 'IT Support' && ['pending', 'in_review'].includes(request.status);
  const canEdit = user.role === 'requester' && request.status === 'revision';
  const isImagePreview = selectedAttachment && /\.(png|jpg|jpeg|gif|webp)$/i.test(selectedAttachment.file_name);
  const isPdfPreview = selectedAttachment && /\.pdf$/i.test(selectedAttachment.file_name);

  return (
    <div className="max-w-6xl flex flex-col lg:flex-row gap-lg">
      <div className="flex-1 bg-canvas border border-hairline p-xl rounded-md shadow-sm">
        <div className="mb-md">
          <Link href="/dashboard" className="text-link text-body-md hover:underline">← Kembali ke Antrian</Link>
        </div>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-sm mb-sm">
          <h2 className="text-title-lg font-medium">ID: #{request.id} - {request.title}</h2>
          {canEdit && (
            <Link 
              href={`/dashboard/requests/${request.id}/edit`}
              className="py-sm px-md bg-info text-on-primary font-medium rounded-md hover:bg-info-border transition-colors text-body-md"
            >
              ✏️ Edit & Resubmit
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm mb-lg text-body-md">
          <div><span className="text-muted">Pemohon:</span> {request.requester_name}</div>
          <div><span className="text-muted">Departemen:</span> {request.department || '-'}</div>
          <div><span className="text-muted">Kategori:</span> {request.category_name}</div>
          <div><span className="text-muted">Prioritas:</span> {request.priority}</div>
          <div><span className="text-muted">Status:</span> <span className="font-medium uppercase">{request.status}</span></div>
          <div><span className="text-muted">Diajukan:</span> {new Date(request.created_at).toLocaleString()}</div>
          {request.leave_date && (
            <div className="col-span-2 bg-surface-soft p-sm rounded border border-hairline mt-xs">
              <span className="text-muted">📅 Tanggal Cuti:</span> <span className="font-medium text-ink">{new Date(request.leave_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        <div className="mb-lg">
          <h3 className="text-label-md font-medium mb-xs">Deskripsi:</h3>
          <div className="bg-surface-soft p-sm rounded-sm border border-hairline whitespace-pre-wrap text-body-md">
            {request.description}
          </div>
        </div>

        {request.attachments && request.attachments.length > 0 && (
          <div className="mb-lg">
            <h3 className="text-label-md font-medium mb-xs">Lampiran:</h3>
            <div className="flex flex-col gap-sm mb-sm">
              {request.attachments.map((att: any) => (
                <div key={att.id} className="flex items-center gap-md bg-surface-soft p-sm rounded border border-hairline w-fit">
                  <span className="text-body-md text-ink">📄 {att.file_name}</span>
                  <div className="flex gap-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedAttachment(att)}
                      className="text-link hover:underline text-body-md border-r border-border-strong pr-sm"
                    >
                      👁️ View
                    </button>
                    <a 
                      href={att.file_url} 
                      download={att.file_name}
                      className="text-link hover:underline text-body-md"
                    >
                      ⬇️ Download
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {selectedAttachment && (
              <div className="border border-hairline rounded-md overflow-hidden bg-surface-soft">
                <div className="flex items-center justify-between px-sm py-xs border-b border-hairline bg-canvas">
                  <span className="text-body-md font-medium text-ink">Preview: {selectedAttachment.file_name}</span>
                  <a href={selectedAttachment.file_url} download={selectedAttachment.file_name} className="text-link text-body-md hover:underline">Download</a>
                </div>
                {isImagePreview ? (
                  <div className="p-sm bg-canvas overflow-auto max-h-[80vh]">
                    <img src={selectedAttachment.file_url} alt={selectedAttachment.file_name} className="max-w-full h-auto mx-auto rounded-sm" />
                  </div>
                ) : isPdfPreview ? (
                  <iframe src={selectedAttachment.file_url} className="w-full h-[80vh] min-h-[520px] bg-canvas" />
                ) : (
                  <div className="p-lg text-body-md text-muted">
                    File ini tidak bisa dipreview langsung oleh browser. Silakan gunakan tombol Download.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {request.approval_steps && request.approval_steps.length > 0 && (
          <div>
            <h3 className="text-label-md font-medium mb-xs">Timeline Approval:</h3>
            <div className="space-y-xs text-body-md">
              {request.approval_steps.map((step: any) => (
                <div key={step.id} className="border-l-2 border-primary pl-sm py-xs">
                  <div className="font-medium text-ink">{step.approver_name} <span className="uppercase text-muted text-xs mx-xs">{step.action}</span></div>
                  <div className="text-muted text-xs">{new Date(step.acted_at).toLocaleString()}</div>
                  {step.notes && <div className="mt-xs text-ink bg-surface-soft p-xs rounded-sm">{step.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {canSupportResolve && (
        <div className="w-full lg:w-[320px] shrink-0 bg-surface-dark text-on-dark p-lg rounded-lg">
          <h3 className="text-title-md mb-md font-medium">Selesaikan Tiket IT</h3>
          <label className="block text-body-md mb-xs opacity-80">Catatan Penyelesaian *</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-[120px] p-sm rounded-sm bg-canvas text-ink text-body-md mb-md border-none focus:outline-none focus:ring-2 focus:ring-info-border"
            placeholder="Contoh: Laptop sudah diperbaiki dan dites normal."
          />
          <label className="block text-body-md mb-xs opacity-80">Bukti Foto / Dokumen</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setSupportFile(e.target.files ? e.target.files[0] : null)}
            className="w-full text-body-md mb-md bg-canvas text-ink rounded-sm p-xs"
          />
          <button
            disabled={loading}
            onClick={handleSupportResolve}
            className="w-full py-sm bg-success text-on-primary font-medium rounded-md hover:bg-success-border transition-colors disabled:opacity-50"
          >
            Tandai Beres
          </button>
        </div>
      )}

      {canApprove && (
        <div className="w-full lg:w-[300px] shrink-0 bg-surface-dark text-on-dark p-lg rounded-lg">
          <h3 className="text-title-md mb-md font-medium">Buat Keputusan</h3>
          
          <label className="block text-body-md mb-xs opacity-80">Catatan (Wajib untuk Reject/Revisi)</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-[100px] p-sm rounded-sm bg-canvas text-ink text-body-md mb-md border-none focus:outline-none focus:ring-2 focus:ring-info-border"
          />

          <div className="flex flex-col gap-sm">
            <button 
              disabled={loading}
              onClick={() => handleAction('approved')}
              className="w-full py-sm bg-success text-on-primary font-medium rounded-md hover:bg-success-border transition-colors"
            >
              ✅ APPROVE
            </button>
            <button 
              disabled={loading}
              onClick={() => handleAction('revision_needed')}
              className="w-full py-sm bg-canvas text-ink font-medium rounded-md hover:bg-surface-strong transition-colors"
            >
              🔄 MINTA REVISI
            </button>
            <button 
              disabled={loading}
              onClick={() => handleAction('rejected')}
              className="w-full py-sm bg-signature-coral text-on-primary font-medium rounded-md hover:opacity-90 transition-colors"
            >
              ❌ TOLAK REQUEST
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
