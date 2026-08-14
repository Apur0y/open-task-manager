import { NextRequest, NextResponse } from "next/server";
import { buildDailyBriefing } from "@/lib/news/briefing";
import { todayInDhaka } from "@/lib/news/store";

export async function GET(request: NextRequest) {
  try {
    const date =
      request.nextUrl.searchParams.get("date") ?? todayInDhaka();
    const briefing = await buildDailyBriefing(date);
    return NextResponse.json(briefing);
  } catch (err) {
    console.error("Failed to build briefing:", err);
    return NextResponse.json(
      { error: "Failed to build briefing" },
      { status: 500 }
    );
  }
}
