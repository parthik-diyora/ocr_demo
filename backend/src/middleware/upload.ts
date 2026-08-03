import path from "node:path";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/webp"
]);

const storage = multer.diskStorage({
  destination: config.uploadDirectory,
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${uuid()}${extension}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError("Only PDF, PNG, JPG, and JPEG files are supported.", 415)
      );
      return;
    }
    callback(null, true);
  }
});

