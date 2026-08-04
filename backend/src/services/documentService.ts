import path from "node:path";
import type {
  DocumentListItem,
  DocumentRepository,
  DocumentRecord
} from "../repositories/documentRepository.js";
import type { ExtractedDocument, OcrResponse } from "../types/document.js";
import { AppError } from "../utils/errors.js";
import { OcrService } from "./ocrService.js";
import { TemplateService } from "./templateService.js";
import { logger } from "../utils/logger.js";

interface UploadedFile {
  path: string;
  filename: string;
  originalname: string;
  mimetype: string;
}

const summarizeOcr = (ocr: OcrResponse) => {
  const confidences = ocr.text.map((item) => item.confidence);
  const avgConfidence =
    confidences.length > 0
      ? Number(
          (
            confidences.reduce((sum, value) => sum + value, 0) /
            confidences.length
          ).toFixed(3)
        )
      : 0;

  return {
    pageCount: ocr.pages.length,
    itemCount: ocr.text.length,
    avgConfidence,
    pages: ocr.pages.map((page) => ({
      page: page.page,
      width: page.width,
      height: page.height,
      itemCount: page.text.length,
      previewText: page.text
        .slice(0, 12)
        .map((item) => item.text)
        .join(" | ")
    })),
    rawTextPreview: ocr.text
      .slice(0, 40)
      .map((item) => item.text)
      .join(" ")
  };
};

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly ocrService: OcrService,
    private readonly templateService: TemplateService
  ) {}

  async process(
    file: UploadedFile,
    userId?: string | null
  ): Promise<ExtractedDocument> {
    const startedAt = Date.now();
    logger.info(
      {
        event: "ocr.pipeline.start",
        originalName: file.originalname,
        mimeType: file.mimetype,
        storedName: file.filename
      },
      "Starting document OCR pipeline"
    );

    let ocr: OcrResponse;
    const ocrStartedAt = Date.now();
    try {
      ocr = await this.ocrService.process(
        file.path,
        file.originalname,
        file.mimetype
      );
    } catch (error) {
      logger.error(
        {
          event: "ocr.pipeline.failed",
          originalName: file.originalname,
          durationMs: Date.now() - ocrStartedAt,
          error: error instanceof Error ? error.message : String(error)
        },
        "OCR service call failed"
      );
      throw error;
    }

    const ocrSummary = summarizeOcr(ocr);
    logger.info(
      {
        event: "ocr.raw.result",
        originalName: file.originalname,
        durationMs: Date.now() - ocrStartedAt,
        ...ocrSummary,
        rawItems: ocr.text.map((item) => ({
          page: item.page,
          text: item.text,
          confidence: Number(item.confidence.toFixed(3)),
          box: item.box
        }))
      },
      "OCR raw data received"
    );

    const extraction = this.templateService.extract(ocr);
    const fieldEntries = Object.entries(extraction.fields);
    const filledFields = fieldEntries.filter(([, value]) =>
      Boolean(value?.trim())
    );
    const emptyFields = fieldEntries
      .filter(([, value]) => !value?.trim())
      .map(([name]) => name);
    const lowConfidenceFields = Object.entries(extraction.confidence)
      .filter(([, score]) => score > 0 && score < 80)
      .map(([name, score]) => ({ name, score }));

    const detectedFields = Object.entries(extraction.template.fields).map(
      ([key, definition]) => ({
        key,
        label: definition.label,
        section: definition.section ?? "Detected Fields",
        type: definition.type,
        value: extraction.fields[key] || null,
        confidence: extraction.confidence[key] ?? 0,
        page: definition.page ?? 1,
        filled: Boolean(extraction.fields[key]?.trim())
      })
    );

    logger.info(
      {
        event: "ocr.fields.detected",
        originalName: file.originalname,
        formTitle: extraction.template.name,
        totalFields: detectedFields.length,
        filledFieldCount: filledFields.length,
        emptyFieldCount: emptyFields.length,
        detectedFields
      },
      `OCR detected ${detectedFields.length} form fields`
    );

    for (const field of detectedFields) {
      logger.info(
        {
          event: "ocr.field.check",
          originalName: file.originalname,
          ...field
        },
        `[FIELD] ${field.section} | ${field.label} | value=${field.value ?? "(empty)"} | conf=${field.confidence}%`
      );
    }

    logger.info(
      {
        event: "ocr.extraction.result",
        originalName: file.originalname,
        templateId: extraction.template.id,
        templateName: extraction.template.name,
        totalFields: fieldEntries.length,
        filledFieldCount: filledFields.length,
        emptyFieldCount: emptyFields.length,
        emptyFields,
        lowConfidenceFields,
        extractedFields: extraction.fields,
        confidenceScores: extraction.confidence,
        durationMs: Date.now() - startedAt
      },
      "Dynamic form fields extracted from uploaded OCR"
    );

    const record = await this.repository.create({
      userId: userId ?? null,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      templateId: extraction.template.id,
      templateName: extraction.template.name,
      fields: extraction.fields,
      confidence: extraction.confidence,
      fieldDefinitions: extraction.template.fields,
      ocrResult: ocr
    });

    logger.info(
      {
        event: "ocr.pipeline.complete",
        documentId: record.id,
        templateId: record.templateId,
        totalFields: fieldEntries.length,
        filledFieldCount: filledFields.length,
        durationMs: Date.now() - startedAt
      },
      "Document processing completed"
    );

    return this.toExtractedDocument(record, ocr);
  }

  listForUser(userId: string): Promise<DocumentListItem[]> {
    return this.repository.listByUserId(userId);
  }

  async getExtractedForUser(
    id: string,
    userId: string
  ): Promise<ExtractedDocument> {
    const record = await this.repository.findById(id);
    if (!record || record.userId !== userId) {
      throw new AppError("Document not found.", 404);
    }
    return this.toExtractedDocument(record, record.ocrResult);
  }

  updateFields(
    id: string,
    fields: Record<string, string>
  ): Promise<DocumentRecord> {
    return this.repository.updateFields(id, fields);
  }

  findById(id: string): Promise<DocumentRecord | null> {
    return this.repository.findById(id);
  }

  private toExtractedDocument(
    record: DocumentRecord,
    ocr: OcrResponse
  ): ExtractedDocument {
    return {
      documentId: record.id,
      template: record.templateId,
      templateName: record.templateName,
      fields: record.fields,
      confidence: record.confidence,
      fieldDefinitions: record.fieldDefinitions,
      ocr,
      fileUrl: `/uploads/${path.basename(record.storedName)}`,
      fileType: record.mimeType
    };
  }
}
