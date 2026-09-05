import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Dashboard
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Manage your study schedule blocks. The total becomes your daily target
        and the tracker adapts in real time.
      </p>
      <DashboardClient />
    </main>
  );
}