import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/tasks";
import { TaskPriority, TaskStatus } from "@/lib/types";

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];
const STATUSES: TaskStatus[] = ["pending", "completed"];

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      updates.title = title;
    }
    if ("description" in body) {
      updates.description =
        typeof body.description === "string" ? body.description.trim() : "";
    }
    if ("assignedDate" in body) {
      if (
        typeof body.assignedDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.assignedDate)
      ) {
        return NextResponse.json(
          { error: "A valid assigned date (YYYY-MM-DD) is required" },
          { status: 400 }
        );
      }
      updates.assignedDate = body.assignedDate;
    }
    if ("status" in body) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if ("priority" in body) {
      if (!PRIORITIES.includes(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      updates.priority = body.priority;
    }

    const task = await updateTask(id, updates);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (err) {
    console.error("Failed to update task:", err);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteTask(id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete task:", err);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
