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
  userId: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  templateId: string;
  templateName: string;
  status: string;
  fields: Record<string, string>;
  confidence: Record<string, number>;
  fieldDefinitions: Record<string, TemplateField>;
  ocrResult: OcrResponse;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListItem {
  id: string;
  originalName: string;
  mimeType: string;
  templateName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type CreateDocumentInput = Omit<
  DocumentRecord,
  "id" | "createdAt" | "updatedAt" | "status"
>;

export interface DocumentRepository {
  initialize?(): Promise<void>;
  create(input: CreateDocumentInput): Promise<DocumentRecord>;
  updateFields(
    id: string,
    fields: Record<string, string>
  ): Promise<DocumentRecord>;
  findById(id: string): Promise<DocumentRecord | null>;
  listByUserId(userId: string): Promise<DocumentListItem[]>;
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
       (user_id, original_name, stored_name, mime_type, template_id, template_name, fields, confidence, field_definitions, ocr_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.userId,
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

  async listByUserId(userId: string): Promise<DocumentListItem[]> {
    const result = await this.pool.query(
      `SELECT id, original_name, mime_type, template_name, status, created_at, updated_at
       FROM documents
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(mapListRow);
  }
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();

  async create(input: CreateDocumentInput): Promise<DocumentRecord> {
    const now = new Date().toISOString();
    const record: DocumentRecord = {
      ...input,
      id: randomUUID(),
      status: "pending_review",
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
      status: "reviewed",
      updatedAt: new Date().toISOString()
    };
    this.documents.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    return this.documents.get(id) ?? null;
  }

  async listByUserId(userId: string): Promise<DocumentListItem[]> {
    return [...this.documents.values()]
      .filter((doc) => doc.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        templateName: doc.templateName,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }));
  }
}

const mapRow = (row: Record<string, unknown>): DocumentRecord => ({
  id: String(row.id),
  userId: row.user_id ? String(row.user_id) : null,
  originalName: String(row.original_name),
  storedName: String(row.stored_name),
  mimeType: String(row.mime_type),
  templateId: String(row.template_id),
  templateName: String(row.template_name),
  status: String(row.status ?? "pending_review"),
  fields: row.fields as Record<string, string>,
  confidence: row.confidence as Record<string, number>,
  fieldDefinitions: (row.field_definitions as Record<string, TemplateField>) ?? {},
  ocrResult: row.ocr_result as OcrResponse,
  createdAt: new Date(String(row.created_at)).toISOString(),
  updatedAt: new Date(String(row.updated_at)).toISOString()
});

const mapListRow = (row: Record<string, unknown>): DocumentListItem => ({
  id: String(row.id),
  originalName: String(row.original_name),
  mimeType: String(row.mime_type),
  templateName: String(row.template_name),
  status: String(row.status ?? "pending_review"),
  createdAt: new Date(String(row.created_at)).toISOString(),
  updatedAt: new Date(String(row.updated_at)).toISOString()
});
