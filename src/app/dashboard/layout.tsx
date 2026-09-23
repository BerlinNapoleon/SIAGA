"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.push("/login");
    } else {
      setUser(JSON.parse(u));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  const links = user.role === "requester"
    ? [
        { href: "/dashboard", label: "📋 My Requests" },
        { href: "/dashboard/new", label: "➕ New Request" },
      ]
    : user.role === "approver"
      ? [
          { href: "/dashboard", label: "📥 Queue" },
        ]
      : user.role === "it_support"
        ? [
            { href: "/dashboard", label: "🛠️ IT Support Queue" },
          ]
        : [
          { href: "/dashboard", label: "📊 Dashboard" },
          { href: "/dashboard/audit", label: "🗒️ Audit Trail" },
        ];

  return (
    <div className="min-h-screen bg-canvas text-body font-sans">
      <nav className="h-[64px] border-b border-hairline flex items-center justify-between px-md md:px-lg bg-canvas text-ink text-body-md sticky top-0 z-20">
        <div className="flex items-center gap-sm">
          <button className="md:hidden text-title-sm" onClick={() => setMenuOpen((value) => !value)}>
            ☰
          </button>
          <div className="font-medium text-title-sm">🏦 SIAGA</div>
        </div>
        <div className="flex items-center gap-sm md:gap-md">
          <span className="hidden sm:inline truncate max-w-[180px]">{user.name} ({user.role})</span>
          <button onClick={handleLogout} className="text-link hover:text-link-active">
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row">
        <aside className={`${menuOpen ? "flex" : "hidden"} md:flex md:w-[240px] border-b md:border-b-0 md:border-r border-hairline md:min-h-[calc(100vh-64px)] p-md flex-col gap-sm bg-canvas z-10`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="px-sm py-sm rounded hover:bg-surface-soft block text-ink">
              {link.label}
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
