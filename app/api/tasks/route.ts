import { NextResponse } from "next/server";
import { createTask, getTasks } from "@/lib/tasks";
import { TaskPriority } from "@/lib/types";

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("Failed to list tasks:", err);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const assignedDate = body.assignedDate;
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (typeof assignedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(assignedDate)) {
      return NextResponse.json(
        { error: "A valid assigned date (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }
    const task = await createTask({
      title,
      description: typeof body.description === "string" ? body.description.trim() : "",
      assignedDate,
      priority: PRIORITIES.includes(body.priority) ? body.priority : "medium",
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("Failed to create task:", err);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
