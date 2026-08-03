import axios from "axios";
import type { ExtractedDocument } from "../types/document";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  timeout: 130_000
});

export const uploadDocument = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ExtractedDocument> => {
  const body = new FormData();
  body.append("file", file);
  const response = await api.post<ExtractedDocument>(
    "/api/documents/upload",
    body,
    {
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      }
    }
  );
  return response.data;
};

export const saveDocument = async (
  documentId: string,
  fields: Record<string, string>
): Promise<void> => {
  await api.put(`/api/documents/${documentId}`, { fields });
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error ?? error.response?.data?.detail;
    return typeof message === "string" ? message : error.message;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
};

