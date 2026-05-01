"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/bank-accounts", label: "Bank accounts" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-brand px-3 py-1.5 font-medium text-white"
                : "rounded-md px-3 py-1.5 text-muted transition-colors hover:bg-brand-soft hover:text-brand"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
