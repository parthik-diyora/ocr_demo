import { Router } from "express";
import type { DocumentController } from "../controllers/documentController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middleware/upload.js";

export const createDocumentRouter = (
  controller: DocumentController
): Router => {
  const router = Router();
  router.post(
    "/upload",
    upload.single("file"),
    asyncHandler(controller.upload)
  );
  router.get("/:id", asyncHandler(controller.getById));
  router.put("/:id", asyncHandler(controller.update));
  return router;
};

