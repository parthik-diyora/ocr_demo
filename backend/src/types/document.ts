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
  image?: string;
  text: OcrItem[];
}

export interface OcrResponse {
  text: OcrItem[];
  pages: OcrPage[];
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

export interface TemplateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

export interface TemplateField extends TemplateRegion {
  label: string;
  type: FieldType;
  section?: string;
  options?: string[];
  required?: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  anchors: string[];
  fields: Record<string, TemplateField>;
}

export interface ExtractedDocument {
  documentId: string;
  template: string;
  templateName: string;
  fields: Record<string, string>;
  confidence: Record<string, number>;
  fieldDefinitions: Record<string, TemplateField>;
  ocr: OcrResponse;
  fileUrl: string;
  fileType: string;
}

export interface SaveDocumentInput {
  documentId: string;
  fields: Record<string, string>;
}

