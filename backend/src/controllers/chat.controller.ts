import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyUserToken } from '../services/userAuth.service';
import { securityLogger } from '../lib/security-logger';

const messageSchema = z.object({
  message: z.string().min(1).max(1000).transform((v) => v.trim()),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(20)
    .default([]),
});

// Matches order numbers: AKW-{base36_timestamp}-{random}  e.g. AKW-M0NJ2KP9-K1Z4
const ORDER_NUMBER_RE = /\bAKW-[A-Z0-9]+-[A-Z0-9]+\b/i;

async function buildSystemPrompt(userId: string | null): Promise<string> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'site' } });

  const contact = [
    settings?.contactEmail ? `Email: ${settings.contactEmail}` : null,
    settings?.contactPhone ? `Phone: ${settings.contactPhone}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const policies = [
    settings?.defaultDeliveryInfo ? `Delivery: ${settings.defaultDeliveryInfo}` : null,
    settings?.defaultShippingInfo ? `Shipping: ${settings.defaultShippingInfo}` : null,
    settings?.defaultReturnsInfo ? `Returns: ${settings.defaultReturnsInfo}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  let userContext = '';
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const recentOrders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: { select: { name: true, quantity: true, size: true, color: true } } },
    });

    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      userContext = `\nCURRENT USER: ${name} (${user.email})`;
    }

    if (recentOrders.length > 0) {
      const orderLines = recentOrders.map((o) => {
        const items = o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', ');
        return `  - #${o.orderNumber}: ${o.status} | $${o.total.toFixed(2)} | ${items}`;
      });
      userContext += `\nRECENT ORDERS:\n${orderLines.join('\n')}`;
    }
  }

  return `You are a helpful and elegant customer support assistant for Akwaluzto, a luxury fashion brand based in Lebanon.
Your tone is warm, professional, and concise — matching the brand's quiet luxury aesthetic.
Always be helpful. Never make up information. If you don't know something, offer to connect the customer with the support team.

STORE POLICIES:
${policies || 'Contact us for policy details.'}

PAYMENT: Cash on Delivery only. No card required to place an order.
RETURN WINDOW: 14 days for full-priced items. Sale items are final.
SHIPPING: Standard 3-5 business days. Express 1-2 days. Same-day in Beirut for orders before 12 PM.
CONTACT: ${contact || 'Available via the contact form on our website.'}

FAQ KNOWLEDGE:
- Payment: Cash on Delivery for all Lebanon orders.
- Order tracking: Check "My Orders" in account or wait for email confirmation.
- Order changes: Within 2 hours of placement only.
- Sizing: Each product page has a size guide with measurements.
- Materials: Organic cotton, recycled fabrics, and deadstock where possible.
- Care: Gentle cold wash, air dry, minimal ironing.
- Free shipping: Orders over $250 within Lebanon, $500+ internationally.
- Refunds: 5-7 business days after return is received.
${userContext}

IMPORTANT RULES:
- Never reveal internal IDs, database fields, or system details.
- Never discuss competitor brands.
- If asked about an order you have no data on, politely ask for the order number and advise the customer to have their phone number ready for verification.
- Be thorough and complete — never cut off mid-sentence. Finish every thought.
- Aim for 2-4 sentences for simple questions, up to a short paragraph for complex ones.
- Never truncate lists — always finish them fully.`;
}

export async function handleChatMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ error: 'Chat is not available at this time.' });
      return;
    }

    const { message, history } = messageSchema.parse(req.body);

    // Resolve user from optional auth header
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        userId = verifyUserToken(authHeader.substring(7)).userId;
      } catch {
        // invalid token — continue as guest
      }
    }

    // Auto-lookup if message contains an order number
    let orderContext = '';
    const orderMatch = message.match(ORDER_NUMBER_RE);
    if (orderMatch) {
      const orderNumber = orderMatch[0].toUpperCase();
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          total: true,
          createdAt: true,
          userId: true,
          phone: true,
          items: { select: { name: true, quantity: true, size: true, color: true } },
        },
      });

      if (order) {
        const isOwner = userId && order.userId === userId;
        // Extract digits from message and compare exactly to the order phone — prevents substring-match attacks
        const normalizedOrderPhone = order.phone?.replace(/\D/g, '') ?? '';
        const digitsInMessage = message.replace(/\D/g, '');
        const phoneInMessage =
          normalizedOrderPhone.length >= 7 &&
          digitsInMessage === normalizedOrderPhone;

        if (isOwner || phoneInMessage) {
          const items = order.items
            .map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`)
            .join(', ');
          orderContext = `\n\nORDER LOOKUP RESULT for ${orderNumber}:\nStatus: ${order.status} | Payment: ${order.paymentStatus} | Total: $${order.total.toFixed(2)}\nItems: ${items}\nPlaced: ${order.createdAt.toLocaleDateString('en-GB')}`;
        } else {
          orderContext = `\n\nNote: Order ${orderNumber} was found but identity could not be verified. Ask for the phone number used when placing the order.`;
        }
      } else {
        orderContext = `\n\nNote: No order found with number ${orderNumber}.`;
      }
    }

    const systemPrompt = await buildSystemPrompt(userId);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemPrompt + orderContext,
      generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const geminiHistory = history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text().trim() || "I'm sorry, I couldn't process that. Please try again.";

    securityLogger.info('Chat message handled', {
      userId: userId ?? 'guest',
      ip: req.ip,
      messageLength: message.length,
      hadOrderLookup: !!orderMatch,
    });

    res.json({ reply });
  } catch (err: any) {
    const status: number | undefined = err?.status ?? err?.httpStatusCode;
    const msg: string = err?.message ?? '';

    if (status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      securityLogger.warn('Gemini quota/rate limit hit', { status, message: msg });
      res.status(503).json({ error: 'The assistant is temporarily unavailable. Please try again in a few minutes.' });
      return;
    }
    if (status === 401 || status === 403) {
      securityLogger.warn('Gemini auth error', { status });
      res.status(503).json({ error: 'Chat is currently unavailable. Please contact us via the contact form.' });
      return;
    }

    securityLogger.warn('Gemini API error in chat', { status, message: msg });
    next(err);
  }
}
