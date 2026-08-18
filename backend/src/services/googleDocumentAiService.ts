import fs from "node:fs/promises";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { config } from "../config.js";
import type {
  BoundingBox,
  OcrItem,
  OcrPage,
  OcrResponse,
  Point
} from "../types/document.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

type TextAnchor = {
  textSegments?: Array<{ startIndex?: number | string; endIndex?: number | string }>;
};

type BoundingPoly = {
  normalizedVertices?: Array<{ x?: number | null; y?: number | null }>;
  vertices?: Array<{ x?: number | null; y?: number | null }>;
};

type Layout = {
  textAnchor?: TextAnchor | null;
  confidence?: number | null;
  boundingPoly?: BoundingPoly | null;
};

type DocAiPage = {
  dimension?: { width?: number | null; height?: number | null } | null;
  tokens?: Array<{ layout?: Layout | null }> | null;
  lines?: Array<{ layout?: Layout | null }> | null;
  paragraphs?: Array<{ layout?: Layout | null }> | null;
  formFields?: Array<{
    fieldName?: Layout | null;
    fieldValue?: Layout | null;
  }> | null;
};

export interface GoogleFormField {
  label: string;
  value: string;
  confidence: number;
  page: number;
  box: BoundingBox;
}

export interface GoogleProcessResult {
  ocr: OcrResponse;
  formFields: GoogleFormField[];
}

export class GoogleDocumentAiService {
  private client: DocumentProcessorServiceClient | null = null;
  private clientLocation: string | null = null;

  private getClient(): DocumentProcessorServiceClient {
    const location = config.GOOGLE_DOCUMENTAI_LOCATION.trim();
    if (!this.client || this.clientLocation !== location) {
      this.client = new DocumentProcessorServiceClient({
        apiEndpoint: `${location}-documentai.googleapis.com`
      });
      this.clientLocation = location;
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(
      config.GOOGLE_CLOUD_PROJECT && config.GOOGLE_DOCUMENTAI_PROCESSOR_ID
    );
  }

  async process(
    filePath: string,
    originalName: string,
    mimeType: string
  ): Promise<GoogleProcessResult> {
    if (!this.isConfigured()) {
      throw new AppError(
        "Google Document AI is not configured. Set GOOGLE_CLOUD_PROJECT and GOOGLE_DOCUMENTAI_PROCESSOR_ID. For local auth without a JSON key, run: gcloud auth application-default login",
        503
      );
    }

    const startedAt = Date.now();
    const location = config.GOOGLE_DOCUMENTAI_LOCATION.trim();
    const project = config.GOOGLE_CLOUD_PROJECT.trim();
    const processorId = config.GOOGLE_DOCUMENTAI_PROCESSOR_ID.trim();
    const name = `projects/${project}/locations/${location}/processors/${processorId}`;
    const content = await fs.readFile(filePath);
    const encoded = content.toString("base64");
    const apiEndpoint = `${location}-documentai.googleapis.com`;

    logger.info(
      {
        event: "ocr.google.request",
        originalName,
        mimeType,
        project,
        location,
        processorId,
        apiEndpoint,
        name,
        bytes: content.length,
        credentialsMode: config.GOOGLE_APPLICATION_CREDENTIALS
          ? "service_account_json"
          : "application_default_credentials"
      },
      "Sending file to Google Document AI"
    );

    try {
      const [result] = await this.getClient().processDocument({
        name,
        skipHumanReview: true,
        rawDocument: {
          content: encoded,
          mimeType: mimeType || "application/pdf"
        }
      });

      const document = result.document;
      if (!document) {
        throw new AppError("Google Document AI returned an empty document.", 502);
      }

      const fullText = document.text ?? "";
      const formFields: GoogleFormField[] = [];
      const pages = (document.pages ?? []).map((page, index) =>
        this.mapPage(page as DocAiPage, index + 1, fullText, formFields)
      );
      const text = pages.flatMap((page) => page.text);
      const ocr: OcrResponse = { text, pages };

      logger.info(
        {
          event: "ocr.google.response",
          originalName,
          pageCount: pages.length,
          itemCount: text.length,
          formFieldCount: formFields.length,
          formFields: formFields.map((field) => ({
            label: field.label,
            value: field.value,
            confidence: Number(field.confidence.toFixed(3)),
            page: field.page
          })),
          durationMs: Date.now() - startedAt
        },
        "Google Document AI response received"
      );

      return { ocr, formFields };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message =
        error instanceof Error ? error.message : "Google Document AI request failed.";
      const details =
        typeof error === "object" && error !== null && "details" in error
          ? (error as { details?: unknown }).details
          : undefined;
      logger.error(
        {
          event: "ocr.google.error",
          originalName,
          durationMs: Date.now() - startedAt,
          apiEndpoint,
          name,
          error: message,
          details
        },
        "Google Document AI request failed"
      );
      throw new AppError(`Google Document AI failed: ${message}`, 502);
    }
  }

  private mapPage(
    page: DocAiPage,
    pageNumber: number,
    fullText: string,
    formFields: GoogleFormField[]
  ): OcrPage {
    const width = Math.max(1, Math.round(page.dimension?.width ?? 1000));
    const height = Math.max(1, Math.round(page.dimension?.height ?? 1000));
    const items: OcrItem[] = [];

    const pushLayout = (layout: Layout | null | undefined) => {
      const text = this.cleanText(this.getText(fullText, layout?.textAnchor));
      if (!text) return;
      items.push({
        text,
        confidence: layout?.confidence ?? 0.9,
        box: this.toBox(layout?.boundingPoly, width, height),
        page: pageNumber
      });
    };

    const lineLayouts = page.lines ?? [];
    if (lineLayouts.length > 0) {
      for (const line of lineLayouts) pushLayout(line.layout);
    } else if ((page.tokens?.length ?? 0) > 0) {
      for (const token of page.tokens ?? []) pushLayout(token.layout);
    } else {
      for (const paragraph of page.paragraphs ?? []) pushLayout(paragraph.layout);
    }

    // Keep Form Parser key/value pairs as structured fields (same as Console).
    for (const field of page.formFields ?? []) {
      const label = this.cleanLabel(
        this.getText(fullText, field.fieldName?.textAnchor)
      );
      const value = this.cleanText(
        this.getText(fullText, field.fieldValue?.textAnchor)
      );
      if (!label && !value) continue;
      formFields.push({
        label: label || `Field ${formFields.length + 1}`,
        value,
        confidence:
          field.fieldValue?.confidence ?? field.fieldName?.confidence ?? 0.95,
        page: pageNumber,
        box: this.toBox(
          field.fieldValue?.boundingPoly ?? field.fieldName?.boundingPoly,
          width,
          height
        )
      });
    }

    return {
      page: pageNumber,
      width,
      height,
      text: items
    };
  }

  private cleanLabel(value: string): string {
    return this.cleanText(value).replace(/[:：]\s*$/u, "").trim();
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/gu, " ").trim();
  }

  private getText(fullText: string, textAnchor?: TextAnchor | null): string {
    const segments = textAnchor?.textSegments;
    if (!segments?.length) return "";
    return segments
      .map((segment) => {
        const start = Number(segment.startIndex ?? 0);
        const end = Number(segment.endIndex ?? 0);
        return fullText.slice(start, end);
      })
      .join("");
  }

  private toBox(
    boundingPoly: BoundingPoly | null | undefined,
    width: number,
    height: number
  ): BoundingBox {
    const normalized = boundingPoly?.normalizedVertices;
    if (normalized && normalized.length >= 4) {
      return normalized.slice(0, 4).map((vertex) => [
        (vertex.x ?? 0) * width,
        (vertex.y ?? 0) * height
      ]) as BoundingBox;
    }

    const vertices = boundingPoly?.vertices;
    if (vertices && vertices.length >= 4) {
      return vertices.slice(0, 4).map((vertex) => [
        vertex.x ?? 0,
        vertex.y ?? 0
      ]) as BoundingBox;
    }

    const fallback: Point = [0, 0];
    return [fallback, fallback, fallback, fallback];
  }
}
