export type OcrProvider = "local" | "google";

export const OCR_PROVIDERS = ["local", "google"] as const;

export const isOcrProvider = (value: unknown): value is OcrProvider =>
  value === "local" || value === "google";
