import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

export type OrderType = "product" | "service" | "unknown";

export interface OrderDoc {
  /** Stripe checkout session id — unguessable, used as the document id. */
  id: string;
  type: OrderType;
  /** Slug from data/products.json or data/services.json, when matched. */
  productSlug?: string;
  title: string;
  amountTotal: number; // cents
  currency: string;
  quantity: number;
  customerEmail?: string;
  customerName?: string;
  shipping?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  /** Answers to the Payment Link's custom dropdown fields (e.g. Celebration Type). */
  variants: Record<string, string>;
  paymentLinkId?: string;
  livemode: boolean;
  status: "paid";
  photosRequired: boolean;
  photosReceived: boolean;
  /** Firebase Storage paths (gs://…) of uploaded customer photos. */
  photoPaths: string[];
  emailSent: boolean;
  createdAt: string; // ISO
}

const ORDERS = "orders";

/** Idempotent write: re-delivered webhooks merge into the same document. */
export async function saveOrder(order: OrderDoc): Promise<void> {
  await adminDb().collection(ORDERS).doc(order.id).set(order, { merge: true });
}

export async function getOrder(id: string): Promise<OrderDoc | null> {
  if (!id || id.length > 200) return null;
  const snap = await adminDb().collection(ORDERS).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as OrderDoc;
}

export async function markPhotosReceived(
  id: string,
  photoPaths: string[]
): Promise<void> {
  await adminDb()
    .collection(ORDERS)
    .doc(id)
    .set(
      {
        photosReceived: true,
        photoPaths: FieldValue.arrayUnion(...photoPaths),
      },
      { merge: true }
    );
}

export async function markEmailSent(id: string, sent: boolean): Promise<void> {
  await adminDb().collection(ORDERS).doc(id).set({ emailSent: sent }, { merge: true });
}

/** Public-safe subset for the photo-upload page — no PII, no addresses. */
export function publicOrderSummary(order: OrderDoc) {
  return {
    id: order.id,
    title: order.title,
    type: order.type,
    amountTotal: order.amountTotal,
    currency: order.currency,
    photosRequired: order.photosRequired,
    photosReceived: order.photosReceived,
    status: order.status,
  };
}
