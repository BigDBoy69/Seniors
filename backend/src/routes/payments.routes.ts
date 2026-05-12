import { Router } from "express";
import { initiatePayment, handleWebhook } from "../controllers/payments.controller";

export const paymentRouter = Router();

// Create payment intention — returns PayMob checkout URL
paymentRouter.post("/create-intent", initiatePayment);

// PayMob webhook callback — JSON body + HMAC query param
paymentRouter.post("/webhook", handleWebhook);
