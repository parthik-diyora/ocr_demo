import multer from "multer";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Validation failed.",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof AppError) {
    response
      .status(error.statusCode)
      .json({ error: error.message, details: error.details });
    return;
  }

  logger.error({ error }, "Unhandled request error");
  response.status(500).json({ error: "Internal server error." });
};

