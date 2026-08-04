import path from "node:path";
import type {
  DocumentListItem,
  DocumentRepository,
  DocumentRecord
} from "../repositories/documentRepository.js";
import type {
  DocumentTemplate,
  ExtractedDocument,
  FieldType,
  OcrResponse,
  TemplateField
} from "../types/document.js";
import type { OcrProvider } from "../types/ocr.js";
import { AppError } from "../utils/errors.js";
import { config } from "../config.js";
import type { GoogleFormField } from "./googleDocumentAiService.js";
import { OcrService } from "./ocrService.js";
import { TemplateService } from "./templateService.js";
import { logger } from "../utils/logger.js";

interface UploadedFile {
  path: string;
  filename: string;
  originalname: string;
  mimetype: string;
}

interface ExtractionResult {
  template: DocumentTemplate;
  fields: Record<string, string>;
  confidence: Record<string, number>;
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

const slugify = (label: string): string => {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "field";
};

const inferFieldType = (label: string, value: string): FieldType => {
  const haystack = `${label} ${value}`.toLowerCase();
  if (haystack.includes("email") || /@/.test(value)) return "email";
  if (
    haystack.includes("phone") ||
    haystack.includes("mobile") ||
    haystack.includes("tel")
  ) {
    return "tel";
  }
  if (haystack.includes("date") || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(value)) {
    return "date";
  }
  if (haystack.includes("address") || value.length > 80) return "textarea";
  if (/^\d+(\.\d+)?$/.test(value.trim())) return "number";
  return "text";
};

const detectTitle = (ocr: OcrResponse): string => {
  const firstLines = ocr.text
    .filter((item) => item.page === 1)
    .slice(0, 8)
    .map((item) => item.text.trim())
    .filter(Boolean);
  const title = firstLines.find(
    (line) =>
      line.length >= 8 &&
      line.length <= 80 &&
      !line.toLowerCase().includes("please complete")
  );
  return title ?? "Google Form Parser";
};

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly ocrService: OcrService,
    private readonly templateService: TemplateService
  ) {}

  async process(
    file: UploadedFile,
    userId?: string | null,
    provider: OcrProvider = config.OCR_PROVIDER_DEFAULT
  ): Promise<ExtractedDocument> {
    const startedAt = Date.now();
    logger.info(
      {
        event: "ocr.pipeline.start",
        provider,
        originalName: file.originalname,
        mimeType: file.mimetype,
        storedName: file.filename
      },
      "Starting document OCR pipeline"
    );

    let ocr: OcrResponse;
    let formFields: GoogleFormField[] | undefined;
    const ocrStartedAt = Date.now();
    try {
      const result = await this.ocrService.process(
        file.path,
        file.originalname,
        file.mimetype,
        provider
      );
      ocr = result.ocr;
      formFields = result.formFields;
    } catch (error) {
      logger.error(
        {
          event: "ocr.pipeline.failed",
          provider,
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
        provider,
        originalName: file.originalname,
        durationMs: Date.now() - ocrStartedAt,
        formFieldCount: formFields?.length ?? 0,
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

    // Google Form Parser: use Console-style key/value pairs directly.
    // Local OCR: keep dynamic heuristic extraction.
    const extraction: ExtractionResult =
      provider === "google" && formFields && formFields.length > 0
        ? this.extractFromGoogleFormFields(formFields, ocr)
        : this.templateService.extract(ocr);

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
        provider,
        source:
          provider === "google" && formFields && formFields.length > 0
            ? "google_form_parser"
            : "local_heuristic",
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
        provider,
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
      "Form fields extracted from uploaded document"
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

  private extractFromGoogleFormFields(
    formFields: GoogleFormField[],
    ocr: OcrResponse
  ): ExtractionResult {
    const fields: Record<string, string> = {};
    const confidence: Record<string, number> = {};
    const fieldDefinitions: Record<string, TemplateField> = {};
    const usedKeys = new Set<string>();

    for (const formField of formFields) {
      const baseKey = slugify(formField.label);
      let key = baseKey;
      let suffix = 2;
      while (usedKeys.has(key)) {
        key = `${baseKey}_${suffix++}`;
      }
      usedKeys.add(key);

      const [x0, y0] = formField.box[0] ?? [0, 0];
      const [x2, y2] = formField.box[2] ?? [x0 + 40, y0 + 16];

      fields[key] = formField.value;
      confidence[key] = Math.round(
        Math.min(1, Math.max(0, formField.confidence)) * 100
      );
      fieldDefinitions[key] = {
        label: formField.label,
        type: inferFieldType(formField.label, formField.value),
        section: `Page ${formField.page}`,
        x: x0,
        y: y0,
        width: Math.max(1, x2 - x0),
        height: Math.max(1, y2 - y0),
        page: formField.page
      };
    }

    return {
      template: {
        id: "google-form-parser",
        name: detectTitle(ocr),
        anchors: [],
        fields: fieldDefinitions
      },
      fields,
      confidence
    };
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
