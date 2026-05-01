"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: ReadonlyArray<{ href: string; label: string; match: string }> = [
  { href: "/dashboard", label: "Projects", match: "/dashboard" },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    match: "/dashboard/invoices",
  },
];

export function ClientNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {ITEMS.map((item) => {
        const active =
          item.match === "/dashboard"
            ? pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/projects")
            : pathname.startsWith(item.match);
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
