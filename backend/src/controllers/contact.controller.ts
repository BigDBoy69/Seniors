import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyUserToken } from "../services/userAuth.service";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  topic: z.string().default("GENERAL"),
  subject: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function submitContact(req: Request, res: Response, next: NextFunction) {
  try {
    const data = contactSchema.parse(req.body);

    // Optional auth check - if user is logged in, link to user
    let userId: string | undefined = undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyUserToken(token);
        userId = payload.userId;
      } catch {
        // Invalid token, treat as guest
      }
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        topic: data.topic,
        subject: data.subject || null,
        message: data.message,
        userId: userId || null,
        status: "NEW",
        read: false,
      },
    });

    res.status(201).json({ 
      success: true, 
      messageId: contactMessage.id,
      message: "Thank you for contacting us. We will respond shortly."
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Validation failed", 
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
      return;
    }
    next(err);
  }
}

export async function getContactMessages(req: Request, res: Response, next: NextFunction) {
  try {
    // This would be protected by admin auth middleware
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
}
