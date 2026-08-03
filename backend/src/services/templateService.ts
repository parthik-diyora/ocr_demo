import type {
  DocumentTemplate,
  FieldType,
  OcrItem,
  OcrResponse,
  TemplateField
} from "../types/document.js";
import { logger } from "../utils/logger.js";

interface ExtractionResult {
  template: DocumentTemplate;
  fields: Record<string, string>;
  confidence: Record<string, number>;
}

interface LineGroup {
  page: number;
  text: string;
  items: OcrItem[];
  top: number;
  bottom: number;
  left: number;
  right: number;
  avgConfidence: number;
}

const FIELD_CORRECTIONS: Record<string, string[]> = {
  gender: ["Male", "Female", "Other"],
  sex: ["Male", "Female", "Other"],
  nationality: [
    "South African",
    "Zimbabwean",
    "Botswanan",
    "Namibian",
    "Indian",
    "British",
    "American",
    "Canadian",
    "Australian"
  ],
  tax_residency_country: [
    "South Africa",
    "Zimbabwe",
    "Botswana",
    "Namibia",
    "United States",
    "United Kingdom",
    "India"
  ],
  country_of_birth: [
    "South Africa",
    "Zimbabwe",
    "Botswana",
    "Namibia",
    "United States",
    "United Kingdom",
    "India"
  ],
  country: [
    "South Africa",
    "Zimbabwe",
    "Botswana",
    "Namibia",
    "United States",
    "United Kingdom",
    "India"
  ],
  marital_status: ["Single", "Married", "Divorced", "Widowed"],
  relationship: ["Self", "Spouse", "Child", "Father", "Mother", "Other"],
  occupation: [
    "Service",
    "Self Employed",
    "Homemaker",
    "Student",
    "Retired",
    "Other"
  ]
};

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenA; i += 1) matrix[i] = [i];
  for (let j = 0; j <= lenB; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }
  return matrix[lenA]![lenB]!;
};

const calculateFuzzyScore = (raw: string, candidate: string): number => {
  const normRaw = raw.toLowerCase().trim();
  const normCandidate = candidate.toLowerCase().trim();

  if (normRaw === normCandidate) return 100;
  if (normRaw.includes(normCandidate) || normCandidate.includes(normRaw))
    return 90;

  const dist = levenshteinDistance(normRaw, normCandidate);
  const maxLen = Math.max(normRaw.length, normCandidate.length);
  if (maxLen === 0) return 100;

  return Math.round((1 - dist / maxLen) * 100);
};

const correctFieldValue = (
  fieldName: string,
  rawText: string
): { value: string; confidenceBoost?: number } => {
  if (!rawText.trim()) return { value: rawText };

  const normKey = fieldName.toLowerCase();
  const matchedKey = Object.keys(FIELD_CORRECTIONS).find(
    (key) => normKey.includes(key) || key.includes(normKey)
  );

  if (!matchedKey) return { value: rawText };

  const candidates = FIELD_CORRECTIONS[matchedKey]!;
  let bestCandidate = rawText;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = calculateFuzzyScore(rawText, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  // Accept if fuzzy confidence > 70
  if (bestScore >= 70) {
    return { value: bestCandidate, confidenceBoost: bestScore };
  }

  return { value: rawText };
};

const LABEL_HINTS = [
  "policy",
  "certificate",
  "tpa",
  "name",
  "address",
  "city",
  "state",
  "pin",
  "phone",
  "email",
  "gender",
  "sex",
  "age",
  "birth",
  "marital",
  "nationality",
  "country",
  "passport",
  "relationship",
  "occupation",
  "hospital",
  "admission",
  "discharge",
  "injury",
  "illness",
  "maternity",
  "diagnosis",
  "room",
  "claim",
  "sum insured",
  "company",
  "medico",
  "police",
  "fir",
  "mlc",
  "pan",
  "bank",
  "account",
  "ifsc",
  "cheque",
  "ambulance",
  "expenses",
  "bill",
  "date",
  "time",
  "system of medicine",
  "domiciliary",
  "covered",
  "hospitalized",
  "please specify",
  "surname",
  "title",
  "initials",
  "contact",
  "cause",
  "death",
  "branch"
];

const SKIP_LABELS = [
  "important",
  "please turn over",
  "to be filled",
  "block letters",
  "star health",
  "allied insurance",
  "corporate office",
  "claims department",
  "check list",
  "checklist",
  "claim form",
  "part - a",
  "part a",
  "to be filled in by the insured"
];

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const boxBounds = (item: OcrItem) => {
  const xValues = item.box.map(([x]) => x);
  const yValues = item.box.map(([, y]) => y);
  return {
    left: Math.min(...xValues),
    top: Math.min(...yValues),
    right: Math.max(...xValues),
    bottom: Math.max(...yValues)
  };
};

const slugify = (label: string, used: Set<string>): string => {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  if (!base) base = "field";
  let key = base;
  let index = 2;
  while (used.has(key)) {
    key = `${base}_${index}`;
    index += 1;
  }
  used.add(key);
  return key;
};

const cleanLabel = (text: string): string =>
  text
    .replace(/^[a-g][.:)]\s*/i, "")
    .replace(/[_.:\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isSectionHeader = (text: string): boolean => {
  const normalized = normalizeText(text);
  return (
    /^[a-g][.:)]\s*/.test(normalized) ||
    /^section\s*[a-g]\b/.test(normalized) ||
    /^details of /.test(normalized) ||
    /^claim documents submitted/.test(normalized) ||
    /^bank account details/.test(normalized) ||
    /^declaration by/.test(normalized)
  );
};

const looksLikeSkip = (text: string): boolean => {
  const normalized = normalizeText(text);
  return SKIP_LABELS.some((skip) => normalized.includes(skip));
};

const hasLabelHint = (text: string): boolean => {
  const normalized = normalizeText(text);
  return LABEL_HINTS.some((hint) => normalized.includes(hint));
};

const isLikelyLabel = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 80) return false;
  if (looksLikeSkip(trimmed)) return false;
  if (isSectionHeader(trimmed)) return false;
  if (/^[\d\s./:-]+$/.test(trimmed)) return false;

  const endsWithColon = /[:：]\s*$/.test(trimmed);
  const lettered = /^[a-z]\)\s+/i.test(trimmed);
  const numbered = /^\d+[.)]\s+/.test(trimmed);
  const question = /\?\s*$/.test(trimmed);
  const blankLine = /_{3,}|-{3,}/.test(trimmed);

  return (
    endsWithColon ||
    lettered ||
    numbered ||
    question ||
    blankLine ||
    hasLabelHint(trimmed)
  );
};

const inferFieldType = (
  label: string,
  value: string,
  lineText: string
): { type: FieldType; options?: string[] } => {
  const lowerLabel = label.toLowerCase().trim();
  const lowerAll = `${label} ${lineText}`.toLowerCase();

  // 1. Specific text fields (Country, Nationality, ID/Passport Number, Account/Bank Number, Names)
  if (
    /\bcountry\b|\bplace of birth\b|\bnationality\b|\bid number\b|\bpassport\b|\breference\b|\baccount\b|\bbank\b|\bsurname\b|\bname\b|\bcode\b/.test(
      lowerLabel
    )
  ) {
    return { type: "text" };
  }

  // 2. Selects / Options
  if (/\b(yes|no)\b/.test(lowerAll) && /\byes\b/.test(lowerAll) && /\bno\b/.test(lowerAll)) {
    return { type: "select", options: ["Yes", "No"] };
  }
  if (/\bgender\b|\bsex\b/.test(lowerLabel)) {
    return { type: "select", options: ["Male", "Female"] };
  }
  if (/\bmarital\b/.test(lowerLabel)) {
    return { type: "select", options: ["Single", "Married", "Divorced", "Widowed"] };
  }
  if (/\brelationship\b/.test(lowerAll)) {
    return {
      type: "select",
      options: ["Self", "Spouse", "Child", "Father", "Mother", "Other"]
    };
  }
  if (/\boccupation\b/.test(lowerAll)) {
    return {
      type: "select",
      options: [
        "Service",
        "Self Employed",
        "Homemaker",
        "Student",
        "Retired",
        "Other"
      ]
    };
  }
  if (/\broom category\b/.test(lowerAll)) {
    return {
      type: "select",
      options: [
        "Day care",
        "Single occupancy",
        "Twin sharing",
        "3 or more beds per room"
      ]
    };
  }
  if (/\bhospitalization due to\b/.test(lowerAll)) {
    return { type: "select", options: ["Injury", "Illness", "Maternity"] };
  }

  // 3. Email & Phone
  if (/\bemail\b/.test(lowerLabel)) return { type: "email" };
  if (/\bphone\b|\bmobile\b|\btel\b|\bcell\b|\bcontact number\b/.test(lowerLabel)) return { type: "tel" };

  // 4. Dates
  if (
    /\bdate of birth\b|\bdob\b|\bdate of application\b|\bcommencement date\b|\badmission date\b|\bdischarge date\b|\bdate of death\b|\bdate\b/.test(
      lowerLabel
    )
  ) {
    return { type: "date" };
  }

  // 5. Numbers
  if (
    /\bage\b|\bamount\b|\brs\b|\bsum insured\b|\bbeds\b|\bdays\b|\bpin\b|\bpostal code\b/.test(
      lowerLabel
    ) ||
    /^\d+([.,]\d+)?$/.test(value.trim())
  ) {
    return { type: "number" };
  }

  // 6. Address / Multi-line Text
  if (/\baddress\b/.test(lowerLabel)) return { type: "textarea" };
  if (/^(yes|no|x|✓|✔)$/i.test(value.trim())) {
    return { type: "checkbox" };
  }

  return { type: "text" };
};

const extractInlineValue = (text: string): { label: string; value: string } => {
  const colonMatch = text.match(/^(.{2,60}?)[:：]\s*(.*)$/);
  if (colonMatch) {
    return {
      label: cleanLabel(colonMatch[1] ?? ""),
      value: (colonMatch[2] ?? "").replace(/[_-]{2,}/g, "").trim()
    };
  }

  const blankMatch = text.match(/^(.{2,60}?)(?:\s+[_.-]{3,}.*)$/);
  if (blankMatch) {
    return { label: cleanLabel(blankMatch[1] ?? ""), value: "" };
  }

  return { label: cleanLabel(text), value: "" };
};

const valueLooksLikeLabel = (value: string): boolean => {
  if (!value.trim()) return false;
  return isLikelyLabel(value) || isSectionHeader(value);
};

export class TemplateService {
  async initialize(): Promise<void> {
    logger.info(
      { event: "form.detector.ready" },
      "Dynamic form field detector ready (no static template fields required)"
    );
  }

  extract(ocr: OcrResponse): ExtractionResult {
    const lines = this.buildLines(ocr);
    const title = this.detectTitle(ocr.text);
    const fields: Record<string, string> = {};
    const confidence: Record<string, number> = {};
    const fieldDefinitions: Record<string, TemplateField> = {};
    const usedKeys = new Set<string>();
    let currentSection = "Form Details";

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const text = line.text.trim();
      if (!text) continue;

      if (isSectionHeader(text)) {
        currentSection = cleanLabel(text);
        continue;
      }

      if (!isLikelyLabel(text)) continue;

      const inline = extractInlineValue(text);
      if (!inline.label || looksLikeSkip(inline.label)) continue;

      let value = inline.value;
      let valueConfidence = line.avgConfidence;

      if (!value) {
        const sameLineValue = this.findSameLineValue(line, inline.label);
        if (sameLineValue) {
          value = sameLineValue.text;
          valueConfidence = sameLineValue.confidence;
        }
      }

      if (!value) {
        const next = lines[index + 1];
        if (
          next &&
          next.page === line.page &&
          next.top - line.bottom < Math.max(28, (line.bottom - line.top) * 1.8) &&
          !isLikelyLabel(next.text) &&
          !isSectionHeader(next.text)
        ) {
          value = next.text.replace(/[_-]{2,}/g, "").trim();
          valueConfidence = next.avgConfidence;
        }
      }

      if (valueLooksLikeLabel(value)) {
        value = "";
        valueConfidence = 0;
      }

      const key = slugify(inline.label, usedKeys);

      // Layer 2: Post-OCR Correction with Field Context (Fuzzy Matching)
      if (value) {
        const correction = correctFieldValue(key, value);
        if (correction.value !== value) {
          logger.info(
            {
              event: "field.post_ocr_corrected",
              key,
              raw: value,
              corrected: correction.value,
              score: correction.confidenceBoost
            },
            `Post-OCR Context Correction: ${key} "${value}" -> "${correction.value}" (${correction.confidenceBoost}%)`
          );
          value = correction.value;
          if (correction.confidenceBoost) {
            valueConfidence = Math.max(
              valueConfidence,
              correction.confidenceBoost / 100
            );
          }
        }
      }

      const inferred = inferFieldType(inline.label, value, text);
      const page = ocr.pages.find((entry) => entry.page === line.page);
      const pageWidth = page?.width || 1;
      const pageHeight = page?.height || 1;

      fieldDefinitions[key] = {
        label: inline.label,
        type: inferred.type,
        options: inferred.options,
        section: currentSection,
        x: line.left / pageWidth,
        y: line.top / pageHeight,
        width: Math.max(0.15, (line.right - line.left) / pageWidth),
        height: Math.max(0.015, (line.bottom - line.top) / pageHeight),
        page: line.page
      };

      fields[key] = value;
      confidence[key] = value
        ? Math.round(Math.min(1, Math.max(0, valueConfidence)) * 100)
        : 0;

      logger.info(
        {
          event: "form.field.detected",
          key,
          label: inline.label,
          section: currentSection,
          type: inferred.type,
          value: value || null,
          confidence: confidence[key],
          page: line.page,
          filled: Boolean(value)
        },
        `Detected field: ${inline.label}${value ? ` = ${value}` : " (empty)"}`
      );
    }

    const detectedFieldList = Object.entries(fieldDefinitions).map(
      ([key, definition]) => ({
        key,
        label: definition.label,
        section: definition.section ?? "Form Details",
        type: definition.type,
        value: fields[key] || null,
        confidence: confidence[key] ?? 0,
        page: definition.page ?? 1,
        filled: Boolean(fields[key])
      })
    );

    const template: DocumentTemplate = {
      id: "dynamic-form",
      name: title,
      anchors: [],
      fields: fieldDefinitions
    };

    logger.info(
      {
        event: "form.detect.complete",
        title,
        fieldCount: detectedFieldList.length,
        filledCount: detectedFieldList.filter((field) => field.filled).length,
        emptyCount: detectedFieldList.filter((field) => !field.filled).length,
        sections: [
          ...new Set(detectedFieldList.map((field) => field.section))
        ],
        detectedFields: detectedFieldList
      },
      `OCR field detection complete: ${detectedFieldList.length} fields found`
    );

    return { template, fields, confidence };
  }

  private detectTitle(items: OcrItem[]): string {
    const preferred = items.find((item) =>
      /claim form|application form|star health|insurance/i.test(item.text)
    );
    if (preferred) return cleanLabel(preferred.text).slice(0, 120);
    return cleanLabel(items[0]?.text ?? "Uploaded Form").slice(0, 120);
  }

  private buildLines(ocr: OcrResponse): LineGroup[] {
    const lines: LineGroup[] = [];

    const sortedPages = [...ocr.pages].sort((a, b) => a.page - b.page);

    for (const page of sortedPages) {
      const sorted = [...page.text].sort((left, right) => {
        const leftBounds = boxBounds(left);
        const rightBounds = boxBounds(right);
        const topDiff = leftBounds.top - rightBounds.top;
        if (Math.abs(topDiff) > 12) {
          return topDiff;
        }
        return leftBounds.left - rightBounds.left;
      });

      let current: OcrItem[] = [];
      let currentTop = 0;

      const flush = () => {
        if (current.length === 0) return;
        const bounds = current.map(boxBounds);
        const left = Math.min(...bounds.map((bound) => bound.left));
        const right = Math.max(...bounds.map((bound) => bound.right));
        const top = Math.min(...bounds.map((bound) => bound.top));
        const bottom = Math.max(...bounds.map((bound) => bound.bottom));
        lines.push({
          page: page.page,
          text: current.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(),
          items: current,
          top,
          bottom,
          left,
          right,
          avgConfidence:
            current.reduce((sum, item) => sum + item.confidence, 0) /
            current.length
        });
        current = [];
      };

      for (const item of sorted) {
        const bounds = boxBounds(item);
        if (current.length === 0) {
          current = [item];
          currentTop = bounds.top;
          continue;
        }
        const threshold = Math.max(
          12,
          (bounds.bottom - bounds.top) * 0.7
        );
        const lastBounds = boxBounds(current[current.length - 1]!);
        const horizontalGap = bounds.left - lastBounds.right;

        // Split line group if vertical Y changes OR if horizontal gap between columns is > 25px
        if (Math.abs(bounds.top - currentTop) <= threshold && horizontalGap < 25) {
          current.push(item);
        } else {
          flush();
          current = [item];
          currentTop = bounds.top;
        }
      }
      flush();
    }

    return lines;
  }

  private findSameLineValue(
    line: LineGroup,
    label: string
  ): { text: string; confidence: number } | null {
    const labelNorm = normalizeText(label);
    const valueItems = line.items.filter((item) => {
      const text = normalizeText(item.text);
      if (!text) return false;
      if (labelNorm.includes(text) || text.includes(labelNorm)) return false;
      if (/^(yes|no|male|female)$/i.test(item.text.trim())) return true;
      return !isLikelyLabel(item.text);
    });

    if (valueItems.length === 0) return null;

    const labelRight = (() => {
      const labelItem = line.items.find((item) =>
        normalizeText(label).includes(normalizeText(item.text))
      );
      return labelItem ? boxBounds(labelItem).right : line.left;
    })();

    const rightSide = valueItems
      .filter((item) => boxBounds(item).left >= labelRight - 8)
      .sort((left, right) => boxBounds(left).left - boxBounds(right).left);

    const chosen = rightSide.length > 0 ? rightSide : valueItems;
    const text = chosen
      .map((item) => item.text)
      .join(" ")
      .replace(/[_-]{2,}/g, "")
      .trim();
    if (!text || valueLooksLikeLabel(text)) return null;

    return {
      text,
      confidence:
        chosen.reduce((sum, item) => sum + item.confidence, 0) / chosen.length
    };
  }
}
