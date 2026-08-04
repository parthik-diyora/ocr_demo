export type Point = [number, number];
export type BoundingBox = [Point, Point, Point, Point];

export interface OcrItem {
  text: string;
  confidence: number;
  box: BoundingBox;
  page: number;
}

export interface OcrPage {
  page: number;
  width: number;
  height: number;
  text: OcrItem[];
}

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "checkbox"
  | "date"
  | "number"
  | "email"
  | "tel";

export interface FieldDefinition {
  label: string;
  type: FieldType;
  section?: string;
  options?: string[];
  required?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

export interface ExtractedDocument {
  documentId: string;
  template: string;
  templateName: string;
  fields: Record<string, string>;
  confidence: Record<string, number>;
  fieldDefinitions: Record<string, FieldDefinition>;
  ocr: {
    text: OcrItem[];
    pages: OcrPage[];
  };
  fileUrl: string;
  fileType: string;
}

export interface DocumentListItem {
  id: string;
  originalName: string;
  mimeType: string;
  templateName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

