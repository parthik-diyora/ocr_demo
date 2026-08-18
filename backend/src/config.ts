import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  OCR_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:root@localhost:5432/ocr"),
  USE_IN_MEMORY_DB: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(20),
  LOG_LEVEL: z.string().default("info"),
  JWT_SECRET: z
    .string()
    .min(16)
    .default("ocr-demo-dev-jwt-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  OCR_PROVIDER_DEFAULT: z.enum(["local", "google"]).default("local"),
  GOOGLE_CLOUD_PROJECT: z.string().optional().default(""),
  GOOGLE_DOCUMENTAI_LOCATION: z.string().default("us"),
  GOOGLE_DOCUMENTAI_PROCESSOR_ID: z.string().optional().default(""),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().default("")
});

const parsed = envSchema.parse(process.env);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, "..");

if (parsed.GOOGLE_APPLICATION_CREDENTIALS.trim()) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS =
    parsed.GOOGLE_APPLICATION_CREDENTIALS.trim();
} else {
  // Prefer Application Default Credentials (gcloud auth application-default login)
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

export const config = {
  ...parsed,
  GOOGLE_APPLICATION_CREDENTIALS: parsed.GOOGLE_APPLICATION_CREDENTIALS.trim(),
  backendRoot,
  uploadDirectory: path.join(backendRoot, "uploads"),
  templateDirectory: path.join(backendRoot, "src", "templates")
};
