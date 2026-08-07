"use client";

import { useCallback, useMemo, useState } from "react";
import StatsBar from "./stats-bar";
import TaskCard from "./task-card";
import { isOverdue, sortTasks, Task, todayString } from "@/lib/types";

interface AllTasksClientProps {
  initialTasks: Task[];
  dbError?: string;
}

type StatusFilter = "all" | "pending" | "completed" | "overdue";

const STATUSES: StatusFilter[] = ["all", "pending", "overdue", "completed"];

export default function AllTasksClient({
  initialTasks,
  dbError,
}: AllTasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [date, setDate] = useState("");

  const today = todayString();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortTasks(tasks).filter((task) => {
      if (q && !task.title.toLowerCase().includes(q)) return false;
      if (date && task.assignedDate !== date) return false;
      switch (status) {
        case "pending":
          return task.status === "pending";
        case "completed":
          return task.status === "completed";
        case "overdue":
          return isOverdue(task, today);
        default:
          return true;
      }
    });
  }, [tasks, search, status, date, today]);

  const inputClass =
    "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="space-y-6">
      {dbError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {dbError}
        </div>
      )}

      <StatsBar tasks={tasks} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className={`${inputClass} flex-1`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className={`${inputClass} sm:w-44`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClass} sm:w-48`}
        />
        {(search || status !== "all" || date) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setDate("");
            }}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {filtered.length} task{filtered.length === 1 ? "" : "s"} found
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No tasks match your filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((task) => (
            <li key={task._id}>
              <TaskCard task={task} onChanged={refresh} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
