import { Task } from "@/lib/types";

interface StatsBarProps {
  tasks: Task[];
}

export default function StatsBar({ tasks }: StatsBarProps) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const overdue = tasks.filter(
    (t) => t.status === "pending" && t.assignedDate < todayKey
  ).length;
  const todayCount = tasks.filter((t) => t.assignedDate === todayKey).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const items = [
    { label: "Total", value: total },
    { label: "Today", value: todayCount },
    { label: "Completed", value: completed },
    { label: "Pending", value: pending },
    { label: "Overdue", value: overdue },
    { label: "Completion Rate", value: `${completionRate}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {item.value}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
