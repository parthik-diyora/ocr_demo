import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "../config.js";
import type { DocumentService } from "../services/documentService.js";
import { isOcrProvider } from "../types/ocr.js";
import { AppError } from "../utils/errors.js";

const updateSchema = z.object({
  fields: z.record(z.string())
});

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  list = async (request: Request, response: Response): Promise<void> => {
    if (!request.auth?.userId) {
      throw new AppError("Authentication required.", 401);
    }
    const documents = await this.documentService.listForUser(
      request.auth.userId
    );
    response.json({ documents });
  };

  upload = async (request: Request, response: Response): Promise<void> => {
    if (!request.file) throw new AppError("A document file is required.", 400);
    const rawProvider = request.body?.provider;
    const provider = isOcrProvider(rawProvider)
      ? rawProvider
      : config.OCR_PROVIDER_DEFAULT;
    const result = await this.documentService.process(
      request.file,
      request.auth?.userId ?? null,
      provider
    );
    response.status(201).json(result);
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const input = updateSchema.parse(request.body);
    const { id } = request.params;
    if (!id) throw new AppError("Document ID is required.", 400);
    if (!request.auth?.userId) {
      throw new AppError("Authentication required.", 401);
    }
    const existing = await this.documentService.findById(String(id));
    if (!existing || existing.userId !== request.auth.userId) {
      throw new AppError("Document not found.", 404);
    }
    const result = await this.documentService.updateFields(
      String(id),
      input.fields
    );
    response.json({
      documentId: result.id,
      fields: result.fields,
      updatedAt: result.updatedAt
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params;
    if (!id) throw new AppError("Document ID is required.", 400);
    if (!request.auth?.userId) {
      throw new AppError("Authentication required.", 401);
    }
    const result = await this.documentService.getExtractedForUser(
      String(id),
      request.auth.userId
    );
    response.json(result);
  };
}
