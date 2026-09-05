import { NextRequest, NextResponse } from "next/server";
import { deleteScheduleBlock } from "@/lib/schedule";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/schedule/[id]">
) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteScheduleBlock(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Schedule block not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete schedule block:", err);
    return NextResponse.json(
      { error: "Failed to delete schedule block" },
      { status: 500 }
    );
  }
}
