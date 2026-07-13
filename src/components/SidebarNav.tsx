"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/news", label: "News & updates log" },
  { href: "/peers", label: "Peer benchmarking" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Primary">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <a key={link.href} href={link.href} className={active ? "sidebar-link active" : "sidebar-link"}>
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
