"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  BarChart3,
  Target,
  Newspaper,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Study", icon: Clock },
  { href: "/history", label: "History", icon: BarChart3 },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/test", label: "Test", icon: ClipboardCheck },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/70 bg-white/90 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/90 pb-safe"
    >
      <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
