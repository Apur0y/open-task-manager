export type TaskStatus = "pending" | "completed";
export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignedDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Pick<
  Task,
  "title" | "description" | "assignedDate" | "priority"
>;

export function todayString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isOverdue(task: Task, today = todayString()): boolean {
  return task.status === "pending" && task.assignedDate < today;
}

export function formatDate(assignedDate: string): string {
  const [y, m, d] = assignedDate.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const priorityOrder: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const priorityLabel: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    if (a.assignedDate !== b.assignedDate) return a.assignedDate < b.assignedDate ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}
