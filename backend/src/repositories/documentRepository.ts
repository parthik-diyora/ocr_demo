import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { config } from "../config.js";
import type { OcrResponse, TemplateField } from "../types/document.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export interface DocumentRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  templateId: string;
  templateName: string;
  fields: Record<string, string>;
  confidence: Record<string, number>;
  fieldDefinitions: Record<string, TemplateField>;
  ocrResult: OcrResponse;
  createdAt: string;
  updatedAt: string;
}

type CreateDocumentInput = Omit<
  DocumentRecord,
  "id" | "createdAt" | "updatedAt"
>;

export interface DocumentRepository {
  initialize?(): Promise<void>;
  create(input: CreateDocumentInput): Promise<DocumentRecord>;
  updateFields(
    id: string,
    fields: Record<string, string>
  ): Promise<DocumentRecord>;
  findById(id: string): Promise<DocumentRecord | null>;
}

export class PostgresDocumentRepository implements DocumentRepository {
  private readonly pool = new Pool({ connectionString: config.DATABASE_URL });

  async initialize(): Promise<void> {
    const schema = await fs.readFile(
      path.join(config.backendRoot, "database", "schema.sql"),
      "utf8"
    );
    await this.pool.query(schema);
    logger.info("PostgreSQL schema is ready.");
  }

  async create(input: CreateDocumentInput): Promise<DocumentRecord> {
    const result = await this.pool.query(
      `INSERT INTO documents
       (original_name, stored_name, mime_type, template_id, template_name, fields, confidence, field_definitions, ocr_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.originalName,
        input.storedName,
        input.mimeType,
        input.templateId,
        input.templateName,
        input.fields,
        input.confidence,
        input.fieldDefinitions,
        input.ocrResult
      ]
    );
    return mapRow(result.rows[0]);
  }

  async updateFields(
    id: string,
    fields: Record<string, string>
  ): Promise<DocumentRecord> {
    const result = await this.pool.query(
      `UPDATE documents
       SET fields = $2, status = 'reviewed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, fields]
    );
    if (result.rowCount === 0) {
      throw new AppError("Document not found.", 404);
    }
    return mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE id = $1",
      [id]
    );
    return result.rowCount ? mapRow(result.rows[0]) : null;
  }
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();

  async create(input: CreateDocumentInput): Promise<DocumentRecord> {
    const now = new Date().toISOString();
    const record: DocumentRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(record.id, record);
    logger.warn("Using in-memory storage; saved data will be lost on restart.");
    return record;
  }

  async updateFields(
    id: string,
    fields: Record<string, string>
  ): Promise<DocumentRecord> {
    const record = this.documents.get(id);
    if (!record) throw new AppError("Document not found.", 404);
    const updated = {
      ...record,
      fields,
      updatedAt: new Date().toISOString()
    };
    this.documents.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    return this.documents.get(id) ?? null;
  }
}

const mapRow = (row: Record<string, unknown>): DocumentRecord => ({
  id: String(row.id),
  originalName: String(row.original_name),
  storedName: String(row.stored_name),
  mimeType: String(row.mime_type),
  templateId: String(row.template_id),
  templateName: String(row.template_name),
  fields: row.fields as Record<string, string>,
  confidence: row.confidence as Record<string, number>,
  fieldDefinitions: (row.field_definitions as Record<string, TemplateField>) ?? {},
  ocrResult: row.ocr_result as OcrResponse,
  createdAt: new Date(String(row.created_at)).toISOString(),
  updatedAt: new Date(String(row.updated_at)).toISOString()
});
