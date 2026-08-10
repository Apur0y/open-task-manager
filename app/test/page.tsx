import TestClient from "@/components/test-client";
import { getPictures } from "@/lib/pictures";
import { Picture } from "@/lib/pictures";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  let pictures: Picture[] = [];
  let dbError: string | undefined;

  try {
    pictures = await getPictures();
  } catch (err) {
    console.error("Failed to load pictures:", err);
    dbError = process.env.MONGODB_URI
      ? "Could not connect to MongoDB. Check that your MONGODB_URI is correct and reachable."
      : "MongoDB is not configured. Add your MONGODB_URI to the .env.local file (see .env.local.example).";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Picture Upload Test
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Upload a picture and review the ones already stored in the database.
      </p>
      <TestClient initialPictures={pictures} dbError={dbError} />
    </main>
  );
}
