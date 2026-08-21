import StudyClient from "@/components/study-client";
import { getActiveSession } from "@/lib/study";
import { StudySession } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study Tracker",
};

export default async function StudyHomePage() {
  let active: StudySession | null = null;
  let dbError: string | undefined;

  try {
    active = await getActiveSession();
  } catch (err) {
    console.error("Failed to load active study session:", err);
    dbError = process.env.MONGODB_URI
      ? "Could not connect to MongoDB. Check that your MONGODB_URI is correct and reachable."
      : "MongoDB is not configured. Add your MONGODB_URI to the .env.local file.";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Study Tracker
        </h1>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          Time is tracked on the server
        </span>
      </div>
      <StudyClient initialActive={active} dbError={dbError} />
    </main>
  );
}
