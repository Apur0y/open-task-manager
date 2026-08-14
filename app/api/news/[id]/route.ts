import { NextRequest, NextResponse } from "next/server";
import { deleteNews, getNewsById, updateNewsFlags } from "@/lib/news/store";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/news/[id]">
) {
  try {
    const { id } = await ctx.params;
    const article = await getNewsById(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (err) {
    console.error("Failed to load article:", err);
    return NextResponse.json(
      { error: "Failed to load article" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/news/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const updates: { read?: boolean; important?: boolean } = {};
    if (typeof body.read === "boolean") updates.read = body.read;
    if (typeof body.important === "boolean") updates.important = body.important;
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const article = await updateNewsFlags(id, updates);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (err) {
    console.error("Failed to update article:", err);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/news/[id]">
) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteNews(id);
    if (!deleted) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete article:", err);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
