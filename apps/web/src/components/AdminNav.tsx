"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

// page links
const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/settings", label: "Church Settings" },
  { href: "/admin/history", label: "History" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-navy/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/admin" className="mr-2 text-base font-bold tracking-tight">
          🚗 Church Rides
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1 overflow-x-auto text-sm">
          {links.map((l) => {
            const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 transition ${
                  active ? "bg-navy text-cream" : "text-navy-muted hover:bg-parchment hover:text-navy"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </button>
      </div>
    </header>
  );
}
