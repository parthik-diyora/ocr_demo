import { useState } from "react";
import {
  getErrorMessage,
  saveDocument,
  uploadDocument
} from "../services/api";
import type { ExtractedDocument } from "../types/document";

export const useDocumentWorkflow = () => {
  const [document, setDocument] = useState<ExtractedDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setSaved(false);
    try {
      const result = await uploadDocument(file, setProgress);
      setDocument(result);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const save = async (fields: Record<string, string>) => {
    if (!document) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveDocument(document.documentId, fields);
      setDocument({ ...document, fields });
      setSaved(true);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDocument(null);
    setProgress(0);
    setError(null);
    setSaved(false);
  };

  return {
    document,
    uploading,
    saving,
    progress,
    error,
    saved,
    upload,
    save,
    reset
  };
};

