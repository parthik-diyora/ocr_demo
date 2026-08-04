import axios from "axios";
import type { AuthResponse, AuthUser } from "../types/auth";
import type { DocumentListItem, ExtractedDocument } from "../types/document";

const TOKEN_KEY = "dms_token";

export const getStoredToken = (): string | null =>
  localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  timeout: 130_000
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = async (input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/api/auth/register", input);
  return response.data;
};

export const login = async (input: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/api/auth/login", input);
  return response.data;
};

export const fetchMe = async (): Promise<AuthUser> => {
  const response = await api.get<{ user: AuthUser }>("/api/auth/me");
  return response.data.user;
};

export const listDocuments = async (): Promise<DocumentListItem[]> => {
  const response = await api.get<{ documents: DocumentListItem[] }>(
    "/api/documents"
  );
  return response.data.documents;
};

export const getDocument = async (
  documentId: string
): Promise<ExtractedDocument> => {
  const response = await api.get<ExtractedDocument>(
    `/api/documents/${documentId}`
  );
  return response.data;
};

export const uploadDocument = async (
  file: File,
  onProgress?: (progress: number) => void,
  provider: "local" | "google" = "local"
): Promise<ExtractedDocument> => {
  const body = new FormData();
  body.append("file", file);
  body.append("provider", provider);
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
