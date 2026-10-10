import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import products from "@/data/products.json";
import services from "@/data/services.json";
import { markEmailSent, saveOrder, type OrderDoc, type OrderType } from "@/lib/orders";
import { sendOrderConfirmation } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CatalogEntry = { slug: string; title: string };

const CATALOG: { entry: CatalogEntry; type: OrderType }[] = [
  ...(products as CatalogEntry[]).map((entry) => ({ entry, type: "product" as OrderType })),
  ...(services as CatalogEntry[]).map((entry) => ({ entry, type: "service" as OrderType })),
];

function lookupCatalog(slug?: string): { entry: CatalogEntry; type: OrderType } | null {
  if (!slug) return null;
  return CATALOG.find((c) => c.entry.slug === slug) ?? null;
}

/** Answers to the Payment Link's custom dropdown fields (e.g. "Celebration Type"). */
function extractVariants(session: Stripe.Checkout.Session): Record<string, string> {
  const variants: Record<string, string> = {};
  for (const field of session.custom_fields ?? []) {
    const label = field.key.replace(/_/g, " ");
    const value =
      field.text?.value ?? field.dropdown?.value ?? field.numeric?.value ?? "";
    if (value) variants[label] = value;
  }
  return variants;
}

async function handleCompletedSession(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const match = lookupCatalog(metadata.product_id);
  const type: OrderType = match?.type ?? "unknown";
  const title = match?.entry.title ?? metadata.product_name ?? "TheMediaBox order";

  const details = session.customer_details;
  const shipping = details?.address
    ? {
        name: details.name ?? undefined,
        line1: details.address.line1 ?? undefined,
        line2: details.address.line2 ?? undefined,
        city: details.address.city ?? undefined,
        state: details.address.state ?? undefined,
        postalCode: details.address.postal_code ?? undefined,
        country: details.address.country ?? undefined,
      }
    : null;

  const order: OrderDoc = {
    id: session.id,
    type,
    productSlug: match?.entry.slug,
    title,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    quantity: 1,
    customerEmail: details?.email ?? undefined,
    customerName: details?.name ?? undefined,
    shipping,
    variants: extractVariants(session),
    paymentLinkId:
      typeof session.payment_link === "string"
        ? session.payment_link
        : session.payment_link?.id,
    livemode: session.livemode,
    status: "paid",
    photosRequired: type === "service",
    photosReceived: false,
    photoPaths: [],
    emailSent: false,
    createdAt: new Date().toISOString(),
  };

  // Best-effort: pull quantity/line-item detail when a secret key is configured.
  if (process.env.STRIPE_SECRET_KEY && session.id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
      const first = items.data[0];
      if (first?.quantity) order.quantity = first.quantity;
    } catch (err) {
      console.warn("Could not fetch line items for", session.id, err);
    }
  }

  // Idempotent: Stripe may redeliver events; merge keeps one order row.
  await saveOrder(order);

  const emailSent = await sendOrderConfirmation(order);
  await markEmailSent(order.id, emailSent);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set — refusing webhook.");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.warn("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCompletedSession(event.data.object as Stripe.Checkout.Session);
    }
    // All other event types are acknowledged and ignored.
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error handling Stripe webhook:", err);
    // Return 500 so Stripe retries the delivery.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
