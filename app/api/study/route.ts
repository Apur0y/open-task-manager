import { NextResponse } from "next/server";
import {
  createSession,
  getActiveSession,
  getSessionsBetween,
  isValidIsoDate,
  isValidIsoTimestamp,
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
    const { timezone, startAt, endAt } = body as {
      timezone?: unknown;
      startAt?: unknown;
      endAt?: unknown;
    };
    if (!isValidTimezone(timezone)) {
      return NextResponse.json(
        { error: "A valid IANA timezone is required" },
        { status: 400 }
      );
    }

    if (startAt !== undefined || endAt !== undefined) {
      if (!isValidIsoTimestamp(startAt) || !isValidIsoTimestamp(endAt)) {
        return NextResponse.json(
          { error: "startAt and endAt must be valid ISO timestamps" },
          { status: 400 }
        );
      }
      const session = await createSession({ startAt, endAt, timezone });
      if (!session) {
        return NextResponse.json(
          { error: "endAt must be after startAt" },
          { status: 400 }
        );
      }
      return NextResponse.json(session, { status: 201 });
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
