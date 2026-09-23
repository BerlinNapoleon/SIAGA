"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', department: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setFormData({ name: data.name, department: data.department || '' });
    } else if (res.status === 401) {
      router.push("/login");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        const user = JSON.parse(localStorage.getItem("user") || '{}');
        user.name = updated.name;
        user.department = updated.department;
        localStorage.setItem("user", JSON.stringify(user));
        setMessage('✅ Profil berhasil diperbarui');
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal memperbarui profil');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });

      if (res.ok) {
        setMessage('✅ Password berhasil diubah');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal mengubah password');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="p-xl text-body-md">Loading...</div>;
  }

  return (
    <div className="space-y-lg">
      <div className="mb-lg">
        <Link href="/dashboard" className="text-link text-body-md hover:underline">← Kembali ke Dashboard</Link>
      </div>

      <div>
        <p className="text-xs text-muted uppercase tracking-wide mb-xs">Pengaturan Akun</p>
        <h1 className="text-title-lg md:text-display-md font-medium">Profil Saya</h1>
        <p className="text-muted text-body-md mt-xs">Kelola informasi akun dan keamanan password Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 space-y-lg">
          {message && (
            <div className="bg-success/10 border border-success text-success p-lg rounded-lg text-body-md">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-signature-coral/10 border border-signature-coral text-signature-coral p-lg rounded-lg text-body-md">
              {error}
            </div>
          )}

          <div className="erp-card p-lg">
            <h2 className="text-title-md font-medium mb-lg">Informasi Profil</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-md">
              <div>
                <label className="erp-label">Email</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="erp-input bg-surface-soft opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted mt-xs">Email tidak bisa diubah</p>
              </div>

              <div>
                <label className="erp-label">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="erp-input"
                />
              </div>

              <div>
                <label className="erp-label">Departemen</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="erp-input"
                  placeholder="Misal: Engineering, Finance"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="erp-button-primary"
              >
                {loading ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </form>
          </div>

          <div className="erp-card p-lg">
            <h2 className="text-title-md font-medium mb-lg">Ubah Password</h2>
            
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="erp-button-secondary"
              >
                🔒 Ubah Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-md">
                <div>
                  <label className="erp-label">Password Lama *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="erp-input"
                    placeholder="Masukkan password lama Anda"
                  />
                </div>

                <div>
                  <label className="erp-label">Password Baru *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="erp-input"
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div>
                  <label className="erp-label">Konfirmasi Password Baru *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="erp-input"
                    placeholder="Ulangi password baru"
                  />
                </div>

                <div className="flex gap-md">
                  <button
                    type="submit"
                    disabled={loading}
                    className="erp-button-primary"
                  >
                    {loading ? 'Mengubah...' : 'Ubah Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="erp-button-secondary"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="erp-card p-lg h-fit">
          <h3 className="text-title-sm font-medium mb-md">Informasi Akun</h3>
          <div className="space-y-md text-body-md">
            <div>
              <p className="text-muted mb-xs">Role</p>
              <p className="font-medium text-ink capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-muted mb-xs">Email</p>
              <p className="font-medium text-ink">{profile.email}</p>
            </div>
            {profile.department && (
              <div>
                <p className="text-muted mb-xs">Departemen</p>
                <p className="font-medium text-ink">{profile.department}</p>
              </div>
            )}
            <div>
              <p className="text-muted mb-xs">Member Sejak</p>
              <p className="font-medium text-ink">{new Date(profile.created_at).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
