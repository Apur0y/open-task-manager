import { NextResponse } from "next/server";
import { stopActiveSession } from "@/lib/study";

export async function POST() {
  try {
    const session = await stopActiveSession();
    if (!session) {
      return NextResponse.json(
        { error: "No active study session" },
        { status: 404 }
      );
    }
    return NextResponse.json(session);
  } catch (err) {
    console.error("Failed to stop study session:", err);
    return NextResponse.json(
      { error: "Failed to stop study session" },
      { status: 500 }
    );
  }
}
