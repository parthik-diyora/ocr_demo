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
  LOG_LEVEL: z.string().default("info")
});

const parsed = envSchema.parse(process.env);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, "..");

export const config = {
  ...parsed,
  backendRoot,
  uploadDirectory: path.join(backendRoot, "uploads"),
  templateDirectory: path.join(backendRoot, "src", "templates")
};
