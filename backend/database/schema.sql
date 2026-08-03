CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  template_id VARCHAR(100) NOT NULL,
  template_name VARCHAR(150) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
  fields JSONB NOT NULL,
  confidence JSONB NOT NULL,
  field_definitions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ocr_result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS field_definitions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS documents_template_id_idx ON documents(template_id);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);
