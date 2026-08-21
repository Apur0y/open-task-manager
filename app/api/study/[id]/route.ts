import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  isValidIsoTimestamp,
  updateSessionTimes,
} from "@/lib/study";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/study/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const updates: { startAt?: string; endAt?: string | null } = {};
    if ("startAt" in body) {
      if (!isValidIsoTimestamp(body.startAt)) {
        return NextResponse.json(
          { error: "startAt must be a valid ISO timestamp" },
          { status: 400 }
        );
      }
      updates.startAt = new Date(body.startAt).toISOString();
    }
    if ("endAt" in body) {
      if (body.endAt === null) {
        updates.endAt = null;
      } else if (!isValidIsoTimestamp(body.endAt)) {
        return NextResponse.json(
          { error: "endAt must be a valid ISO timestamp or null" },
          { status: 400 }
        );
      } else {
        updates.endAt = new Date(body.endAt).toISOString();
      }
    }
    if (updates.startAt === undefined && updates.endAt === undefined) {
      return NextResponse.json(
        { error: "Nothing to update. Provide startAt and/or endAt." },
        { status: 400 }
      );
    }

    const session = await updateSessionTimes(id, updates);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found or end time is not after start time" },
        { status: 400 }
      );
    }
    return NextResponse.json(session);
  } catch (err) {
    console.error("Failed to update study session:", err);
    return NextResponse.json(
      { error: "Failed to update study session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/study/[id]">
) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteSession(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete study session:", err);
    return NextResponse.json(
      { error: "Failed to delete study session" },
      { status: 500 }
    );
  }
}
