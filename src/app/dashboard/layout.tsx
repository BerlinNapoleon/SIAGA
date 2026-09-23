"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Notification = {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  request_id: number | null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.push("/login");
    } else {
      setUser(JSON.parse(u));
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [router]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleNotificationClick = async (notif: Notification) => {
    const token = localStorage.getItem("token");
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId: notif.id, is_read: true }),
      });
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }

    if (notif.request_id) {
      router.push(`/dashboard/requests/${notif.request_id}`);
      setNotificationsOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return null;

  const links = user.role === "requester"
    ? [
        { href: "/dashboard", label: "My Requests", icon: "📋" },
        { href: "/dashboard/new", label: "New Request", icon: "➕" },
      ]
    : user.role === "approver"
      ? [{ href: "/dashboard", label: "Approval Queue", icon: "📥" }]
      : user.role === "it_support"
        ? [{ href: "/dashboard", label: "IT Support Queue", icon: "🛠️" }]
        : [
            { href: "/dashboard", label: "Dashboard", icon: "📊" },
            { href: "/dashboard/users", label: "Users", icon: "👥" },
            { href: "/dashboard/categories", label: "Categories", icon: "📁" },
            { href: "/dashboard/audit", label: "Audit Trail", icon: "🗒️" },
          ];

  return (
    <div className="erp-shell">
      <nav className="erp-topbar">
        <div className="flex items-center gap-sm">
          <button className="md:hidden text-title-sm" onClick={() => setMenuOpen((value) => !value)}>
            ☰
          </button>
          <div className="flex items-center gap-xs">
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center font-medium">S</div>
            <div>
              <div className="font-medium text-title-sm leading-none">SIAGA</div>
              <div className="hidden sm:block text-xs text-muted mt-[2px]">Internal Approval ERP</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sm md:gap-md">
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-xs text-title-sm hover:bg-surface-soft rounded-md transition-colors"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-signature-coral text-on-primary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-md w-[360px] bg-white border border-[#e6e8ee] rounded-lg shadow-lg z-50">
                <div className="px-md py-sm border-b border-[#e6e8ee]">
                  <h3 className="text-title-sm font-medium">Notifikasi</h3>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-md py-lg text-body-md text-muted text-center">Tidak ada notifikasi</div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-md py-sm border-b border-[#eef0f4] hover:bg-surface-soft transition-colors ${!notif.is_read ? 'bg-[#f0f4ff]' : ''}`}
                      >
                        <div className="flex items-start gap-sm">
                          <div className="text-title-sm mt-xs">{notif.is_read ? '✓' : '●'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-md text-ink line-clamp-2">{notif.message}</p>
                            <p className="text-xs text-muted mt-xs">{new Date(notif.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <Link href="/dashboard/profile" className="text-body-md text-ink font-medium truncate max-w-[220px] hover:text-primary transition-colors">
              {user.name}
            </Link>
            <span className="text-xs text-muted capitalize">{user.role.replace("_", " ")}</span>
          </div>
          <button onClick={handleLogout} className="erp-button-secondary h-[38px]">
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row">
        <aside className={`${menuOpen ? "flex" : "hidden"} md:flex md:w-[260px] erp-sidebar flex-col z-10`}>
          <div className="hidden md:block px-sm pb-sm mb-sm border-b border-[#eef0f4]">
            <div className="text-xs text-muted uppercase tracking-wide">Workspace</div>
            <div className="text-caption text-ink mt-xs">CIMB Internal Ops</div>
          </div>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="erp-nav-link">
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </aside>
        <main className="flex-1 p-md md:p-xl min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
