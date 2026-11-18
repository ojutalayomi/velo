"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit log" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-4xl gap-4 border-b px-4 pt-4">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`pb-2 text-sm ${pathname === t.href ? "border-b-2 border-brand font-bold" : "text-gray-500"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
