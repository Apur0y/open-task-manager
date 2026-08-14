import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-lg font-bold text-neutral-900 dark:text-neutral-100"
        >
          ✓ Task Tracker
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Today
          </Link>
          <Link
            href="/all"
            className="rounded-lg px-3 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            All Tasks
          </Link>
          <Link
            href="/targets"
            className="rounded-lg px-3 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Targets
          </Link>
          <Link
            href="/news"
            className="rounded-lg px-3 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            News
          </Link>
          <Link
            href="/test"
            className="rounded-lg px-3 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Test
          </Link>
        </nav>
      </div>
    </header>
  );
}
//