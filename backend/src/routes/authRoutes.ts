import { Router } from "express";
import type { AuthController } from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { RequestHandler } from "express";

export const createAuthRouter = (
  controller: AuthController,
  requireAuth: RequestHandler
): Router => {
  const router = Router();
  router.post("/register", asyncHandler(controller.register));
  router.post("/login", asyncHandler(controller.login));
  router.get("/me", requireAuth, asyncHandler(controller.me));
  return router;
};
