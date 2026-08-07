"use client";

import { useState } from "react";
import ConfirmDialog from "./confirm-dialog";
import TaskForm from "./task-form";
import { priorityLabel, Task, TaskInput } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  showDate?: boolean;
  onChanged: () => void | Promise<void>;
}

const priorityBadge: Record<Task["priority"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export default function TaskCard({ task, showDate = true, onChanged }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function mutate(patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Request failed");
      await onChanged();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setConfirmingDelete(false);
      await onChanged();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <TaskForm
          initial={task}
          submitLabel="Save Changes"
          onCancel={() => setEditing(false)}
          onSubmit={(data: TaskInput) => mutate(data).then(() => setEditing(false))}
        />
      </div>
    );
  }

  const completed = task.status === "completed";

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-opacity ${
        completed
          ? "border-neutral-200 bg-neutral-50 opacity-70 dark:border-neutral-800 dark:bg-neutral-900/50"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          title={completed ? "Mark incomplete" : "Mark complete"}
          disabled={busy}
          onClick={() => mutate({ status: completed ? "pending" : "completed" })}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition-colors disabled:opacity-50 ${
            completed
              ? "border-green-500 bg-green-500 text-white"
              : "border-neutral-400 text-transparent hover:border-green-500 dark:border-neutral-600"
          }`}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`font-medium ${
                completed
                  ? "text-neutral-500 line-through dark:text-neutral-400"
                  : "text-neutral-900 dark:text-neutral-100"
              }`}
            >
              {task.title}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityBadge[task.priority]}`}
            >
              {priorityLabel[task.priority]}
            </span>
            {completed && (
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Completed
              </span>
            )}
          </div>

          {task.description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {task.description}
            </p>
          )}

          {showDate && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                Date
              </span>
              <input
                type="date"
                value={task.assignedDate}
                onChange={(e) => mutate({ assignedDate: e.target.value })}
                className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xs text-neutral-600 outline-none hover:border-neutral-300 focus:border-neutral-500 dark:text-neutral-300 dark:hover:border-neutral-700"
                title="Change assigned date"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <button
          type="button"
          disabled={busy}
          onClick={() => mutate({ status: completed ? "pending" : "completed" })}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            completed
              ? "border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              : "bg-green-600 text-white hover:bg-green-500"
          }`}
        >
          {completed ? "Mark Incomplete" : "Complete"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(true)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmingDelete(true)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete Task"
          message={`Delete "${task.title}"? This cannot be undone.`}
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
