import fs from "node:fs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { DocumentController } from "./controllers/documentController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import {
  type DocumentRepository,
  InMemoryDocumentRepository,
  PostgresDocumentRepository
} from "./repositories/documentRepository.js";
import { createDocumentRouter } from "./routes/documentRoutes.js";
import { DocumentService } from "./services/documentService.js";
import { OcrService } from "./services/ocrService.js";
import { TemplateService } from "./services/templateService.js";
import { logger } from "./utils/logger.js";

export const createApp = async () => {
  fs.mkdirSync(config.uploadDirectory, { recursive: true });

  const templateService = new TemplateService();
  await templateService.initialize();
  let repository: DocumentRepository = config.USE_IN_MEMORY_DB
    ? new InMemoryDocumentRepository()
    : new PostgresDocumentRepository();
  try {
    await repository.initialize?.();
  } catch (error) {
    logger.warn(
      { error },
      "PostgreSQL connection failed. Falling back to in-memory storage."
    );
    repository = new InMemoryDocumentRepository();
  }
  const service = new DocumentService(
    repository,
    new OcrService(),
    templateService
  );
  const controller = new DocumentController(service);

  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: config.FRONTEND_ORIGIN }));
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ logger }));
  app.use("/uploads", express.static(config.uploadDirectory));
  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "backend" });
  });
  app.use("/api/documents", createDocumentRouter(controller));
  app.use(errorHandler);
  return app;
};
