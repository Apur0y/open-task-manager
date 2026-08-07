"use client";

import { useCallback, useState } from "react";
import QuickAdd from "./quick-add";
import TaskCard from "./task-card";
import { isOverdue, sortTasks, Task, todayString } from "@/lib/types";

interface HomeClientProps {
  initialTasks: Task[];
  dbError?: string;
}

export default function HomeClient({ initialTasks, dbError }: HomeClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const today = todayString();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  if (dbError) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        {dbError}
      </div>
    );
  }

  const sorted = sortTasks(tasks);
  const todays = sorted.filter((t) => t.assignedDate === today);
  const pending = sorted.filter((t) => isOverdue(t, today));

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Today&apos;s Tasks
          </h2>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {today}
          </span>
        </div>
        {todays.length === 0 ? (
          <EmptyState text="No tasks assigned for today. Add one below." />
        ) : (
          <ul className="space-y-3">
            {todays.map((task) => (
              <li key={task._id}>
                <TaskCard task={task} onChanged={refresh} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Pending / Overdue
        </h2>
        {pending.length === 0 ? (
          <EmptyState text="Nothing overdue. Great job staying on top of things!" />
        ) : (
          <ul className="space-y-3">
            {pending.map((task) => (
              <li key={task._id}>
                <TaskCard task={task} onChanged={refresh} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Quick Add Task
        </h2>
        <QuickAdd onCreated={refresh} />
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      {text}
    </p>
  );
}
