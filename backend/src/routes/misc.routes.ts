import { Router } from "express";
import {
  subscribe,
  unsubscribe,
  adminListMessages,
  adminMarkMessageRead,
  adminGetSubscribers,
  adminSendNewsletter,
} from "../controllers/misc.controller";

export const miscRouter = Router();
export const miscAdminRouter = Router();

// POST /contact is handled exclusively by contact.routes.ts (submitContact).
// The duplicate route that was here (misc.controller::contactMessage) has been
// removed — it ran first due to route registration order and had weaker validation.
miscRouter.post("/newsletter", subscribe);
miscRouter.get("/newsletter/unsubscribe", unsubscribe);

miscAdminRouter.get("/messages", adminListMessages);
miscAdminRouter.patch("/messages/:id/read", adminMarkMessageRead);

// Newsletter admin
miscAdminRouter.get("/newsletter/subscribers", adminGetSubscribers);
miscAdminRouter.post("/newsletter/send", adminSendNewsletter);
