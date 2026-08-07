"use client";

import { useState } from "react";
import TaskForm from "./task-form";
import { TaskInput } from "@/lib/types";

interface QuickAddProps {
  onCreated: () => void | Promise<void>;
}

export default function QuickAdd({ onCreated }: QuickAddProps) {
  const [open, setOpen] = useState(false);

  async function handleCreate(data: TaskInput) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create task");
    setOpen(false);
    await onCreated();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-neutral-400 px-4 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-600 hover:text-neutral-900 dark:border-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
      >
        + Quick Add Task
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        New Task
      </h3>
      <TaskForm
        submitLabel="Add Task"
        onCancel={() => setOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
