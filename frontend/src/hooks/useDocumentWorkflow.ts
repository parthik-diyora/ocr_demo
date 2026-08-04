import { useEffect, useState } from "react";
import {
  getDocument,
  getErrorMessage,
  saveDocument,
  uploadDocument
} from "../services/api";
import type { ExtractedDocument } from "../types/document";
import type { OcrProvider } from "../types/ocr";

export const useDocumentWorkflow = (documentId?: string) => {
  const [document, setDocument] = useState<ExtractedDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [provider, setProvider] = useState<OcrProvider>("local");

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      setSaved(false);
      try {
        const result = await getDocument(documentId);
        setDocument(result);
      } catch (loadError) {
        setDocument(null);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [documentId]);

  const upload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setSaved(false);
    try {
      const result = await uploadDocument(file, setProgress, provider);
      setDocument(result);
      return result;
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
      return null;
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
    loading,
    saving,
    progress,
    error,
    saved,
    provider,
    setProvider,
    upload,
    save,
    reset
  };
};
