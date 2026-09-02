import Link from "next/link";
import { Check } from "lucide-react";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/80 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Check className="h-4.5 w-4.5" strokeWidth={3} aria-hidden="true" />
          </span>
          Study Tracker
        </Link>
      </div>
    </header>
  );
}
