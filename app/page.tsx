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
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
      <StudyClient initialActive={active} dbError={dbError} />
    </main>
  );
}
