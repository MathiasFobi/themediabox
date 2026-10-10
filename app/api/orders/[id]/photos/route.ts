import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { getOrder, markPhotosReceived } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per photo

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "photo";
}

/**
 * Receives customer photos for AI-service orders.
 * Files are stored privately in Firebase Storage under order-uploads/{orderId}/
 * and their paths are recorded on the order document for fulfillment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }
    if (order.type !== "service") {
      return NextResponse.json(
        { error: "photo upload is only needed for AI photo services" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("photos")
      .filter((v): v is File => v instanceof File && v.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "no photos attached" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `too many photos — maximum ${MAX_FILES} per upload` },
        { status: 400 }
      );
    }

    const bucket = adminStorage().bucket();
    const savedPaths: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `"${file.name}" is not an image` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `"${file.name}" exceeds the 10 MB limit` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const path = `order-uploads/${order.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
      await bucket.file(path).save(buffer, {
        contentType: file.type,
        metadata: { orderId: order.id },
      });
      savedPaths.push(path);
    }

    await markPhotosReceived(order.id, savedPaths);
    return NextResponse.json({ uploaded: savedPaths.length });
  } catch (err) {
    console.error("Photo upload failed:", err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
