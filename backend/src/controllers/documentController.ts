import type { Request, Response } from "express";
import { z } from "zod";
import type { DocumentService } from "../services/documentService.js";
import { AppError } from "../utils/errors.js";

const updateSchema = z.object({
  fields: z.record(z.string())
});

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  upload = async (request: Request, response: Response): Promise<void> => {
    if (!request.file) throw new AppError("A document file is required.", 400);
    const result = await this.documentService.process(request.file);
    response.status(201).json(result);
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const input = updateSchema.parse(request.body);
    const { id } = request.params;
    if (!id) throw new AppError("Document ID is required.", 400);
    const docId = String(id);
    const result = await this.documentService.updateFields(
      docId,
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
    const docId = String(id);
    const result = await this.documentService.findById(docId);
    if (!result) throw new AppError("Document not found.", 404);
    response.json(result);
  };
}

