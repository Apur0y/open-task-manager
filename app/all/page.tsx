import AllTasksClient from "@/components/all-tasks-client";
import { getTasks } from "@/lib/tasks";
import { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AllTasksPage() {
  let tasks: Task[] = [];
  let dbError: string | undefined;

  try {
    tasks = await getTasks();
  } catch (err) {
    console.error("Failed to load tasks:", err);
    dbError =
      process.env.MONGODB_URI
        ? "Could not connect to MongoDB. Check that your MONGODB_URI is correct and reachable."
        : "MongoDB is not configured. Add your MONGODB_URI to the .env.local file (see .env.local.example).";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        All Tasks
      </h1>
      <AllTasksClient initialTasks={tasks} dbError={dbError} />
    </main>
  );
}
