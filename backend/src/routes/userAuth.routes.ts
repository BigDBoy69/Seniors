import { Router } from "express";
import { 
  signup, 
  login, 
  getMe, 
  requireUserAuth,
  verifyEmailEndpoint,
  resendVerification,
  requestPasswordResetEndpoint,
  resetPasswordEndpoint,
  deleteAccountEndpoint,
  requestDeletionEndpoint,
  confirmDeletionEndpoint,
} from "../controllers/userAuth.controller";
import { confirmPasswordChange } from "../controllers/account.controller";

export const userAuthRouter = Router();

userAuthRouter.post("/signup", signup);
userAuthRouter.post("/login", login);
userAuthRouter.get("/me", requireUserAuth, getMe);
userAuthRouter.get("/verify-email", verifyEmailEndpoint);
userAuthRouter.post("/resend-verification", resendVerification);
userAuthRouter.post("/forgot-password", requestPasswordResetEndpoint);
userAuthRouter.post("/reset-password", resetPasswordEndpoint);
// Legacy direct-delete removed — email-confirmed path (/request-deletion → /confirm-deletion) is the only deletion flow
// Email-confirmed deletion — request requires auth; confirm uses the token as proof
userAuthRouter.post("/request-deletion", requireUserAuth, requestDeletionEndpoint);
userAuthRouter.get("/confirm-deletion", confirmDeletionEndpoint);
userAuthRouter.get("/confirm-password-change", confirmPasswordChange);
