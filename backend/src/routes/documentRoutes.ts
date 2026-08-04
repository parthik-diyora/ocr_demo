import { Router, type RequestHandler } from "express";
import type { DocumentController } from "../controllers/documentController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middleware/upload.js";

export const createDocumentRouter = (
  controller: DocumentController,
  requireAuth: RequestHandler
): Router => {
  const router = Router();
  router.use(requireAuth);
  router.get("/", asyncHandler(controller.list));
  router.post(
    "/upload",
    upload.single("file"),
    asyncHandler(controller.upload)
  );
  router.get("/:id", asyncHandler(controller.getById));
  router.put("/:id", asyncHandler(controller.update));
  return router;
};
