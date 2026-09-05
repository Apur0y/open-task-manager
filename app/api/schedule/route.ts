import { NextResponse } from "next/server";
import {
  addScheduleBlock,
  getScheduleBlocks,
  isValidBlockInput,
  replaceScheduleBlocks,
} from "@/lib/schedule";

export async function GET() {
  try {
    const blocks = await getScheduleBlocks();
    return NextResponse.json(blocks);
  } catch (err) {
    console.error("Failed to load schedule blocks:", err);
    return NextResponse.json(
      { error: "Failed to load schedule blocks" },
      { status: 500 }
    );
  }
}

interface BlockCandidate {
  startMin?: unknown;
  endMin?: unknown;
}

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const candidate = body as { blocks?: unknown } & BlockCandidate;

    if ("blocks" in candidate) {
      if (!Array.isArray(candidate.blocks)) {
        return NextResponse.json(
          { error: "blocks must be an array" },
          { status: 400 }
        );
      }
      const blocks: { startMin: number; endMin: number }[] = [];
      for (const b of candidate.blocks) {
        if (!isValidBlockInput(b)) {
          return NextResponse.json(
            {
              error:
                "Each block needs numeric startMin and endMin with endMin > startMin (0-1440)",
            },
            { status: 400 }
          );
        }
        blocks.push({ startMin: b.startMin, endMin: b.endMin });
      }
      const saved = await replaceScheduleBlocks(blocks);
      return NextResponse.json(saved);
    }

    const { startMin, endMin } = candidate;
    if (!isValidBlockInput({ startMin, endMin })) {
      return NextResponse.json(
        {
          error:
            "startMin/endMin must be valid minutes (0-1440, end > start)",
        },
        { status: 400 }
      );
    }
    const block = await addScheduleBlock({
      startMin: startMin as number,
      endMin: endMin as number,
    });
    if (!block) {
      return NextResponse.json(
        { error: "Could not add schedule block" },
        { status: 400 }
      );
    }
    return NextResponse.json(block, { status: 201 });
  } catch (err) {
    console.error("Failed to save schedule blocks:", err);
    return NextResponse.json(
      { error: "Failed to save schedule blocks" },
      { status: 500 }
    );
  }
}