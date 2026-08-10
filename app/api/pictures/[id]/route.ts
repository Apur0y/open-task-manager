import { NextRequest, NextResponse } from "next/server";
import { deletePicture, getPicture } from "@/lib/pictures";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/pictures/[id]">
) {
  try {
    const { id } = await ctx.params;
    const picture = await getPicture(id);
    if (!picture) {
      return NextResponse.json({ error: "Picture not found" }, { status: 404 });
    }
    return new Response(new Uint8Array(picture.data), {
      headers: {
        "Content-Type": picture.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Failed to load picture:", err);
    return NextResponse.json(
      { error: "Failed to load picture" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/pictures/[id]">
) {
  try {
    const { id } = await ctx.params;
    const deleted = await deletePicture(id);
    if (!deleted) {
      return NextResponse.json({ error: "Picture not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete picture:", err);
    return NextResponse.json(
      { error: "Failed to delete picture" },
      { status: 500 }
    );
  }
}
