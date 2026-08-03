import fs from "node:fs";
import axios from "axios";
import FormData from "form-data";
import { config } from "../config.js";
import type { OcrResponse } from "../types/document.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export class OcrService {
  async process(
    filePath: string,
    originalName: string,
    mimeType: string
  ): Promise<OcrResponse> {
    const startedAt = Date.now();
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), {
      filename: originalName,
      contentType: mimeType
    });

    logger.info(
      {
        event: "ocr.client.request",
        url: `${config.OCR_SERVICE_URL}/ocr`,
        originalName,
        mimeType,
        filePath
      },
      "Sending file to OCR service"
    );

    try {
      const response = await axios.post<OcrResponse>(
        `${config.OCR_SERVICE_URL}/ocr`,
        form,
        {
          headers: form.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 120_000
        }
      );

      logger.info(
        {
          event: "ocr.client.response",
          originalName,
          pageCount: response.data.pages.length,
          itemCount: response.data.text.length,
          durationMs: Date.now() - startedAt
        },
        "OCR service response received"
      );

      return response.data;
    } catch (error) {
      logger.error(
        {
          event: "ocr.client.error",
          originalName,
          durationMs: Date.now() - startedAt,
          error: axios.isAxiosError(error)
            ? error.response?.data?.detail ?? error.message
            : error instanceof Error
              ? error.message
              : String(error)
        },
        "OCR service request failed"
      );

      if (axios.isAxiosError(error)) {
        throw new AppError(
          `OCR service failed: ${error.response?.data?.detail ?? error.message}`,
          502
        );
      }
      throw error;
    }
  }
}
