import { Resend } from "resend";
import type { OrderDoc } from "./orders";

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Sends the order confirmation email. Returns true on success.
 * Fails OPEN (returns false, logs) when email is not configured — the order
 * itself is always saved by the webhook regardless.
 */
export async function sendOrderConfirmation(order: OrderDoc): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.warn(
      "Order confirmation email skipped: RESEND_API_KEY or RESEND_FROM not set."
    );
    return false;
  }
  if (!order.customerEmail) {
    console.warn(`Order confirmation email skipped: no customer email on order ${order.id}.`);
    return false;
  }

  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const uploadUrl = `${appUrl}/upload-photos?order=${encodeURIComponent(order.id)}`;
  const amount = formatAmount(order.amountTotal, order.currency);

  const photosBlock = order.photosRequired
    ? `
      <p style="margin: 16px 0;">To get started, please upload your photos here:</p>
      <p style="margin: 16px 0;"><a href="${uploadUrl}" style="display: inline-block; background: #b8860b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-weight: 600;">Upload your photos</a></p>
      <p style="margin: 16px 0; color: #666; font-size: 14px;">We'll begin work as soon as your photos arrive. Keep this link — it's tied to your order.</p>
    `
    : `
      <p style="margin: 16px 0;">We'll email you again when your order ships.</p>
    `;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
      <h1 style="font-size: 24px;">Thank you for your order! 🎉</h1>
      <p>Hi${order.customerName ? ` ${order.customerName}` : ""},</p>
      <p>Your payment of <strong>${amount}</strong> for <strong>${order.title}</strong> is confirmed.</p>
      <div style="background: #faf7f0; border: 1px solid #e8dcc0; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Order:</strong> ${order.title}</p>
        <p style="margin: 4px 0;"><strong>Amount:</strong> ${amount}</p>
        <p style="margin: 4px 0;"><strong>Order ID:</strong> <code>${order.id}</code></p>
      </div>
      ${photosBlock}
      <p style="color: #666; font-size: 14px;">Questions? Just reply to this email.</p>
      <p style="color: #666; font-size: 14px;">— TheMediaBox</p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: order.customerEmail,
      subject: `Your TheMediaBox order is confirmed — ${order.title}`,
      html,
    });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send order confirmation email:", err);
    return false;
  }
}
