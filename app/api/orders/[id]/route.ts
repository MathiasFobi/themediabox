import { NextRequest, NextResponse } from "next/server";
import { getOrder, publicOrderSummary } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public order summary for the photo-upload page. No PII, no addresses. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }
    return NextResponse.json(publicOrderSummary(order));
  } catch (err) {
    console.error("Order lookup failed:", err);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
}
