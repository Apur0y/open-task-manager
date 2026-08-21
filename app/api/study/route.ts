import { NextResponse } from "next/server";
import {
  getActiveSession,
  getSessionsBetween,
  isValidIsoDate,
  isValidTimezone,
  startSession,
} from "@/lib/study";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("active") === "1") {
      const session = await getActiveSession();
      return NextResponse.json(session);
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
      return NextResponse.json(
        { error: "Provide from and to as YYYY-MM-DD, or active=1" },
        { status: 400 }
      );
    }
    if (from > to) {
      return NextResponse.json(
        { error: "from must be on or before to" },
        { status: 400 }
      );
    }
    const sessions = await getSessionsBetween(from, to);
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("Failed to list study sessions:", err);
    return NextResponse.json(
      { error: "Failed to load study sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const timezone = (body as { timezone?: unknown }).timezone;
    if (!isValidTimezone(timezone)) {
      return NextResponse.json(
        { error: "A valid IANA timezone is required" },
        { status: 400 }
      );
    }

    const active = await getActiveSession();
    if (active) {
      return NextResponse.json(
        { error: "A study session is already active", session: active },
        { status: 409 }
      );
    }

    const session = await startSession(timezone);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("Failed to start study session:", err);
    return NextResponse.json(
      { error: "Failed to start study session" },
      { status: 500 }
    );
  }
}
