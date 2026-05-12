import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { sendNewsletterEmail } from "../services/email.service";
import { securityLogger } from "../lib/security-logger";

export async function subscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, source } = z.object({
      email: z.string().email(),
      source: z.string().optional(),
    }).parse(req.body);

    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { active: true, unsubscribedAt: null, unsubscribeToken }, // Refresh token on resubscribe
      create: { 
        email, 
        source: source ?? "website",
        unsubscribeToken,
        active: true,
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function adminListMessages(_req: Request, res: Response, next: NextFunction) {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

export async function adminMarkMessageRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ========================================
// NEWSLETTER ADMIN
// ========================================

export async function adminGetSubscribers(_req: Request, res: Response, next: NextFunction) {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: subscribers.length,
      active: subscribers.filter(s => s.active).length,
      unsubscribed: subscribers.filter(s => !s.active).length,
    };

    res.json({ subscribers, stats });
  } catch (err) {
    next(err);
  }
}

export async function adminSendNewsletter(req: Request, res: Response, next: NextFunction) {
  try {
    const { subject, heading, body, ctaLabel, ctaLink } = z.object({
      subject: z.string().min(1).max(200),
      heading: z.string().min(1).max(200),
      body: z.string().min(1).max(5000),
      ctaLabel: z.string().max(50).optional(),
      ctaLink: z.string().url().optional(),
    }).parse(req.body);

    // Validate CTA: both or neither
    if ((ctaLabel && !ctaLink) || (!ctaLabel && ctaLink)) {
      res.status(400).json({ error: "CTA label and link must both be provided or both omitted" });
      return;
    }

    // Get all active subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { active: true },
    });

    if (subscribers.length === 0) {
      res.status(400).json({ error: "No active subscribers to send to" });
      return;
    }

    // Send emails in batches of 10 (parallel per batch) to avoid sequential timeout
    const BATCH_SIZE = 10;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(subscriber =>
          sendNewsletterEmail(
            subscriber.email,
            subject,
            heading,
            body,
            ctaLabel,
            ctaLink,
            subscriber.unsubscribeToken ?? undefined
          )
        )
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failureCount++;
          securityLogger.error("Newsletter send failed for subscriber", {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    }

    securityLogger.info("Newsletter sent", { 
      subject, 
      totalSubscribers: subscribers.length, 
      successCount, 
      failureCount 
    });

    res.json({ 
      success: true, 
      totalSubscribers: subscribers.length,
      successCount, 
      failureCount 
    });
  } catch (err) {
    next(err);
  }
}

export async function unsubscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = z.object({
      token: z.string(),
    }).parse(req.query);

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      res.status(400).json({ success: false, message: "Invalid unsubscribe link" });
      return;
    }

    if (!subscriber.active) {
      res.json({ success: true, message: "Already unsubscribed" });
      return;
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { 
        active: false, 
        unsubscribedAt: new Date() 
      },
    });

    securityLogger.info("Newsletter unsubscribe", { email: subscriber.email });

    res.json({ success: true, message: "Successfully unsubscribed from newsletter" });
  } catch (err) {
    next(err);
  }
}
