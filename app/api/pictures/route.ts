import { NextResponse } from "next/server";
import {
  createPicture,
  getPictures,
  IMAGE_CONTENT_TYPES,
} from "@/lib/pictures";

export const maxDuration = 60;

const MAX_SIZE = 5 * 1024 * 1024;

export async function GET() {
  try {
    const pictures = await getPictures();
    return NextResponse.json(pictures);
  } catch (err) {
    console.error("Failed to list pictures:", err);
    return NextResponse.json(
      { error: "Failed to load pictures" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A file is required" },
        { status: 400 }
      );
    }
    if (!IMAGE_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 5 MB" },
        { status: 400 }
      );
    }

    const data = Buffer.from(await file.arrayBuffer());
    const picture = await createPicture({
      name: file.name || "untitled",
      contentType: file.type,
      size: file.size,
      data,
    });

    return NextResponse.json(picture, { status: 201 });
  } catch (err) {
    console.error("Failed to upload picture:", err);
    return NextResponse.json(
      { error: "Failed to upload picture" },
      { status: 500 }
    );
  }
}
