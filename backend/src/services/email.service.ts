// ========================================
import { Resend } from "resend";
import { securityLogger } from "../lib/security-logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "Akwaluzto <onboarding@resend.dev>";

if (resend) {
  securityLogger.info("Email service initialized", { provider: "Resend", sender: FROM_EMAIL });
} else {
  securityLogger.warn("Email service disabled - RESEND_API_KEY not configured");
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    securityLogger.warn("Email skipped: RESEND_API_KEY not configured", { to, subject });
    return;
  }
  const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html, text });
  if (error) {
    securityLogger.error("Email send failed", { to, subject, error: error.message });
    throw error;
  }
}

// --- Order confirmation / receipt ---

export async function sendOrderConfirmationEmail(order: {
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  status: string;
  paymentStatus?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string | null;
    color?: string | null;
  }>;
}) {
  if (!order.customerEmail) return;

  try {
    const paymentMethodLabel =
      order.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on Delivery" : "Card Payment";

    const statusLabel = formatStatus(order.status);
    const paymentLabel = formatStatus(order.paymentStatus ?? order.status);

    const itemRows = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:500;color:#111827;">${escapeHtml(item.name)}</div>
            ${item.size || item.color ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${[item.size, item.color].filter(Boolean).join(" / ")}</div>` : ""}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;">$${item.price.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 24px 16px;">
          <div style="font-size:20px;font-weight:600;color:#111827;">Akwaluzto</div>
          <div style="height:3px;background:#111827;width:40px;margin-top:12px;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <h1 style="font-size:18px;font-weight:600;color:#111827;margin:0;">Order Confirmation</h1>
          <p style="font-size:14px;color:#4b5563;margin:8px 0 0;line-height:1.5;">
            Hi ${escapeHtml(order.customerName ?? "there")},<br>
            Thank you for your order. We have received it and will begin processing shortly.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:6px;padding:16px;">
            <tr><td style="font-size:12px;color:#6b7280;padding-bottom:4px;">Order Number</td></tr>
            <tr><td style="font-size:16px;font-weight:600;color:#111827;padding-bottom:12px;">${order.orderNumber}</td></tr>
            <tr><td style="font-size:12px;color:#6b7280;padding-bottom:4px;">Status</td></tr>
            <tr><td style="font-size:14px;font-weight:500;color:#111827;padding-bottom:12px;">${statusLabel}</td></tr>
            <tr><td style="font-size:12px;color:#6b7280;padding-bottom:4px;">Payment</td></tr>
            <tr><td style="font-size:14px;font-weight:500;color:#111827;">${paymentMethodLabel} — ${paymentLabel}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 8px;">
          <h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px;">Order Summary</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
            <thead>
              <tr>
                <th align="left" style="padding:8px 0;border-bottom:2px solid #e5e7eb;font-weight:600;color:#111827;">Item</th>
                <th align="center" style="padding:8px 0;border-bottom:2px solid #e5e7eb;font-weight:600;color:#111827;width:60px;">Qty</th>
                <th align="right" style="padding:8px 0;border-bottom:2px solid #e5e7eb;font-weight:600;color:#111827;width:80px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #e5e7eb;padding-top:12px;font-size:13px;color:#374151;">
            <tr><td style="padding:4px 0;">Subtotal</td><td align="right">$${order.subtotal.toFixed(2)}</td></tr>
            <tr><td style="padding:4px 0;">Delivery</td><td align="right">$${order.deliveryFee.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0 0;font-size:15px;font-weight:600;color:#111827;">Total</td><td align="right" style="padding:8px 0 0;font-size:15px;font-weight:600;color:#111827;">$${order.total.toFixed(2)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 32px;">
          <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
            If you have any questions, reply to this email or contact our support team.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `Akwaluzto - Order Confirmation\n\nHi ${order.customerName ?? "there"},\n\nThank you for your order.\n\nOrder Number: ${order.orderNumber}\nStatus: ${statusLabel}\nPayment: ${paymentMethodLabel} — ${paymentLabel}\n\nItems:\n${order.items.map((i) => `- ${i.name}${i.size || i.color ? ` (${[i.size, i.color].filter(Boolean).join(" / ")})` : ""} x${i.quantity} — $${i.price.toFixed(2)}`).join("\n")}\n\nSubtotal: $${order.subtotal.toFixed(2)}\nDelivery: $${order.deliveryFee.toFixed(2)}\nTotal: $${order.total.toFixed(2)}\n\nQuestions? Reply to this email.`;

    await sendEmail({ to: order.customerEmail, subject: `Order Confirmation — ${order.orderNumber}`, html, text });
    securityLogger.info("Order confirmation email sent", { orderNumber: order.orderNumber, to: order.customerEmail });
  } catch (err) {
    securityLogger.error("Order confirmation email failed", { orderNumber: order.orderNumber, error: (err as Error).message });
  }
}

// --- Order status update ---

export async function sendOrderStatusUpdateEmail(order: {
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  previousStatus: string;
}) {
  if (!order.customerEmail) return;

  try {
    const newStatus = formatStatus(order.status);
    const prevStatus = formatStatus(order.previousStatus);
    const message = statusUpdateMessage(order.status);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 24px 16px;">
          <div style="font-size:20px;font-weight:600;color:#111827;">Akwaluzto</div>
          <div style="height:3px;background:#111827;width:40px;margin-top:12px;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <h1 style="font-size:18px;font-weight:600;color:#111827;margin:0;">Order Update</h1>
          <p style="font-size:14px;color:#4b5563;margin:8px 0 0;line-height:1.5;">
            Hi ${escapeHtml(order.customerName ?? "there")},<br>
            Your order <strong>${order.orderNumber}</strong> has been updated.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:6px;padding:16px;">
            <tr>
              <td style="width:50%;padding-right:8px;">
                <div style="font-size:12px;color:#6b7280;padding-bottom:4px;">Previous Status</div>
                <div style="font-size:14px;font-weight:500;color:#6b7280;">${prevStatus}</div>
              </td>
              <td style="width:50%;padding-left:8px;">
                <div style="font-size:12px;color:#6b7280;padding-bottom:4px;">New Status</div>
                <div style="font-size:16px;font-weight:600;color:#111827;">${newStatus}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <p style="font-size:14px;color:#4b5563;margin:0;line-height:1.5;">${message}</p>
        </td></tr>
        <tr><td style="padding:0 24px 32px;">
          <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
            If you have any questions, reply to this email or contact our support team.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `Akwaluzto - Order Update\n\nHi ${order.customerName ?? "there"},\n\nYour order ${order.orderNumber} has been updated.\n\nPrevious Status: ${prevStatus}\nNew Status: ${newStatus}\n\n${message}\n\nQuestions? Reply to this email.`;

    await sendEmail({ to: order.customerEmail, subject: `Order Update — ${order.orderNumber}`, html, text });
    securityLogger.info("Order status update email sent", { orderNumber: order.orderNumber, to: order.customerEmail, status: order.status });
  } catch (err) {
    securityLogger.error("Order status update email failed", { orderNumber: order.orderNumber, error: (err as Error).message });
  }
}

// --- Helpers ---

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusUpdateMessage(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Your order has been confirmed and is being prepared for shipment.";
    case "OUT_FOR_DELIVERY":
      return "Your order is on its way! Our delivery team will contact you shortly.";
    case "DELIVERED":
      return "Your order has been delivered. We hope you love it!";
    case "CANCELLED":
      return "Your order has been cancelled. If you did not request this, please contact us immediately.";
    default:
      return "Your order status has changed. Contact us if you have any questions.";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Email Verification ---

export async function sendVerificationEmail(email: string, token: string, firstName?: string | null) {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const name = firstName || "there";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 24px 16px;">
          <div style="font-size:20px;font-weight:600;color:#111827;">Akwaluzto</div>
          <div style="height:3px;background:#111827;width:40px;margin-top:12px;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <h1 style="font-size:18px;font-weight:600;color:#111827;margin:0;">Verify Your Email</h1>
          <p style="font-size:14px;color:#4b5563;margin:8px 0 0;line-height:1.5;">
            Hi ${escapeHtml(name)},<br>
            Welcome to Akwaluzto! Please verify your email address to complete your account setup.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Verify Email Address</a>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.5;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color:#111827;word-break:break-all;">${verificationUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 32px;">
          <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `Akwaluzto - Verify Your Email\n\nHi ${name},\n\nWelcome to Akwaluzto! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.`;

    await sendEmail({ to: email, subject: "Verify Your Email - Akwaluzto", html, text });
    securityLogger.info("Verification email sent", { to: email });
  } catch (err) {
    securityLogger.error("Verification email failed", { to: email, error: (err as Error).message });
    // Don't throw - verification email failure shouldn't break signup
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  firstName?: string | null
): Promise<void> {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const name = firstName || 'there';

  const html = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5;">
      <div style="background: #111827; color: #f5f3f0; padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 400; letter-spacing: 0.2em;">AKWALUZTO</h1>
        <div style="width: 60px; height: 2px; background: #f5f3f0; margin: 16px auto 0;"></div>
      </div>
      
      <div style="padding: 40px 32px;">
        <h2 style="font-size: 24px; color: #111827; margin: 0 0 24px 0; font-weight: 400;">Reset Your Password</h2>
        
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${name},
        </p>
        
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          We received a request to reset your password for your Akwaluzto account. Click the button below to create a new password:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" 
             style="display: inline-block; background: #111827; color: #f5f3f0; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
          This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
          If you did not request this reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e5e5;">
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
          If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #6b7280; word-break: break-all;">${resetLink}</a>
        </p>
      </div>
    </div>
  `;

  const text = `
    Reset Your Password
    
    Hi ${name},
    
    We received a request to reset your password for your Akwaluzto account.
    
    Click this link to reset your password:
    ${resetLink}
    
    This link will expire in 1 hour for security reasons.
    
    If you did not request this reset, you can safely ignore this email.
    
    �
    Akwaluzto
  `;

  await sendEmail({
    to,
    subject: 'Reset Your Password - Akwaluzto',
    html,
    text,
  });
}

// --- Newsletter ---



export async function sendNewsletterEmail(
  email: string,
  subject: string,
  heading: string,
  body: string,
  ctaLabel?: string,
  ctaLink?: string,
  unsubscribeToken?: string
) {
  try {
    const unsubscribeUrl = unsubscribeToken 
      ? `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`
      : null;

    const paragraphs = body.split('\n').filter((p: string) => p.trim());
    const bodyHtml = paragraphs.map((p: string) => `<p style="font-size:14px;color:#4b5563;margin:0 0 12px;line-height:1.6;">${escapeHtml(p)}</p>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px">
        <tr><td style="padding:32px 24px 16px">
          <div style="font-size:20px;font-weight:600;color:#111827">Akwaluzto</div>
          <div style="height:3px;background:#111827;width:40px;margin-top:12px"></div>
        </td></tr>
        <tr><td style="padding:0 24px 16px">
          <h1 style="font-size:22px;font-weight:600;color:#111827;margin:0 0 16px">${escapeHtml(heading)}</h1>
          ${bodyHtml}
        </td></tr>
        ${ctaLabel && ctaLink ? `<tr><td style="padding:0 24px 24px"><a href="${ctaLink}" style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none">${escapeHtml(ctaLabel)}</a></td></tr>` : ''}
        <tr><td style="padding:0 24px 24px">
          <div style="border-top:1px solid #e5e7eb;padding-top:16px">
            <p style="font-size:12px;color:#9ca3af;margin:0">You subscribed to Akwaluzto updates.${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}">Unsubscribe</a>` : ''}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textParts = [heading, '', ...paragraphs];
    if (ctaLabel && ctaLink) textParts.push('', `${ctaLabel}: ${ctaLink}`);
    if (unsubscribeUrl) textParts.push('', `Unsubscribe: ${unsubscribeUrl}`);
    const text = textParts.join('\n');

    await sendEmail({ to: email, subject, html, text });
  } catch (err) {
    securityLogger.error("Newsletter email failed", { to: email, error: (err as Error).message });
    throw err;
  }
}



// --- Account deletion confirmation ---

export async function sendAccountDeletionEmail(
  email: string,
  token: string,
  firstName?: string | null,
) {
  try {
    const confirmUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/confirm-delete?token=${token}`;
    const name = firstName || 'there';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 24px 16px;">
          <div style="font-size:20px;font-weight:600;color:#111827;">Akwaluzto</div>
          <div style="height:3px;background:#111827;width:40px;margin-top:12px;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <h1 style="font-size:18px;font-weight:600;color:#111827;margin:0;">Confirm Account Deletion</h1>
          <p style="font-size:14px;color:#4b5563;margin:8px 0 0;line-height:1.5;">
            Hi ${escapeHtml(name)},<br><br>
            We received a request to permanently delete your Akwaluzto account and all associated data.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;">
            <p style="font-size:13px;color:#991b1b;margin:0;line-height:1.5;">
              <strong>This action is permanent.</strong> Your account, order history, saved items, and personal data will be removed and cannot be recovered.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Confirm Account Deletion</a>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.5;">
            Or copy and paste this link:<br>
            <a href="${confirmUrl}" style="color:#374151;word-break:break-all;">${confirmUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 32px;">
          <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
            This link expires in 1 hour. If you did not request this, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `Akwaluzto - Confirm Account Deletion\n\nHi ${name},\n\nWe received a request to permanently delete your Akwaluzto account.\n\nThis action is permanent and cannot be undone.\n\nTo confirm, visit:\n${confirmUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`;

    await sendEmail({ to: email, subject: 'Confirm Account Deletion - Akwaluzto', html, text });
    securityLogger.info('Account deletion email sent', { to: email });
  } catch (err) {
    securityLogger.error('Account deletion email failed', { to: email, error: (err as Error).message });
    throw err;
  }
}

// --- Password change confirmation ---

export async function sendPasswordChangeEmail(
  email: string,
  token: string,
  firstName?: string | null,
) {
  try {
    const confirmUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/confirm-password-change?token=${token}`;
    const name = firstName || 'there';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 24px 16px;">
          <div style="font-size:20px;font-weight:600;color:#111827;">Akwaluzto</div>
          <div style="height:3px;background:#111827;width:40px;margin-top:12px;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <h1 style="font-size:18px;font-weight:600;color:#111827;margin:0;">Confirm Password Change</h1>
          <p style="font-size:14px;color:#4b5563;margin:8px 0 0;line-height:1.5;">
            Hi ${escapeHtml(name)},<br><br>
            We received a request to change your Akwaluzto account password. Click the button below to confirm.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Confirm Password Change</a>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.5;">
            Or copy and paste this link:<br>
            <a href="${confirmUrl}" style="color:#374151;word-break:break-all;">${confirmUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 32px;">
          <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
            This link expires in 1 hour. If you did not request this change, your password remains unchanged — but we recommend securing your account.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `Akwaluzto - Confirm Password Change\n\nHi ${name},\n\nWe received a request to change your password.\n\nTo confirm, visit:\n${confirmUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`;

    await sendEmail({ to: email, subject: 'Confirm Your Password Change - Akwaluzto', html, text });
    securityLogger.info('Password change confirmation email sent', { to: email });
  } catch (err) {
    securityLogger.error('Password change email failed', { to: email, error: (err as Error).message });
    throw err;
  }
}