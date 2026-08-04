import fs from "node:fs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { AuthController } from "./controllers/authController.js";
import { DocumentController } from "./controllers/documentController.js";
import { createRequireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import {
  type DocumentRepository,
  InMemoryDocumentRepository,
  PostgresDocumentRepository
} from "./repositories/documentRepository.js";
import {
  type UserRepository,
  InMemoryUserRepository,
  PostgresUserRepository
} from "./repositories/userRepository.js";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createDocumentRouter } from "./routes/documentRoutes.js";
import { AuthService } from "./services/authService.js";
import { DocumentService } from "./services/documentService.js";
import { OcrService } from "./services/ocrService.js";
import { TemplateService } from "./services/templateService.js";
import { logger } from "./utils/logger.js";

export const createApp = async () => {
  fs.mkdirSync(config.uploadDirectory, { recursive: true });

  const templateService = new TemplateService();
  await templateService.initialize();

  let documentRepository: DocumentRepository = config.USE_IN_MEMORY_DB
    ? new InMemoryDocumentRepository()
    : new PostgresDocumentRepository();
  let userRepository: UserRepository = config.USE_IN_MEMORY_DB
    ? new InMemoryUserRepository()
    : new PostgresUserRepository();

  try {
    await documentRepository.initialize?.();
  } catch (error) {
    logger.warn(
      { error },
      "PostgreSQL connection failed. Falling back to in-memory storage."
    );
    documentRepository = new InMemoryDocumentRepository();
    userRepository = new InMemoryUserRepository();
  }

  const authService = new AuthService(userRepository);
  const requireAuth = createRequireAuth(authService);
  const authController = new AuthController(authService);

  const documentService = new DocumentService(
    documentRepository,
    new OcrService(),
    templateService
  );
  const documentController = new DocumentController(documentService);

  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: config.FRONTEND_ORIGIN }));
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ logger }));
  app.use("/uploads", express.static(config.uploadDirectory));
  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "backend" });
  });
  app.use("/api/auth", createAuthRouter(authController, requireAuth));
  app.use(
    "/api/documents",
    createDocumentRouter(documentController, requireAuth)
  );
  app.use(errorHandler);
  return app;
};
