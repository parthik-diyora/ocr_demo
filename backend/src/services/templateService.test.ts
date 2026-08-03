import { beforeAll, describe, expect, it } from "vitest";
import type { OcrResponse } from "../types/document.js";
import { TemplateService } from "./templateService.js";

const ocr: OcrResponse = {
  text: [
    {
      text: "CLAIM FORM - PART - A",
      confidence: 0.99,
      box: [
        [100, 20],
        [400, 20],
        [400, 50],
        [100, 50]
      ],
      page: 1
    },
    {
      text: "SECTION A: DETAILS OF PRIMARY INSURED",
      confidence: 0.98,
      box: [
        [40, 80],
        [420, 80],
        [420, 105],
        [40, 105]
      ],
      page: 1
    },
    {
      text: "a) Policy No:",
      confidence: 0.96,
      box: [
        [40, 120],
        [160, 120],
        [160, 145],
        [40, 145]
      ],
      page: 1
    },
    {
      text: "P/123456/01",
      confidence: 0.94,
      box: [
        [180, 120],
        [320, 120],
        [320, 145],
        [180, 145]
      ],
      page: 1
    },
    {
      text: "d) Name:",
      confidence: 0.95,
      box: [
        [40, 170],
        [120, 170],
        [120, 195],
        [40, 195]
      ],
      page: 1
    },
    {
      text: "Jane Doe",
      confidence: 0.93,
      box: [
        [140, 170],
        [260, 170],
        [260, 195],
        [140, 195]
      ],
      page: 1
    },
    {
      text: "Email ID:",
      confidence: 0.92,
      box: [
        [40, 220],
        [120, 220],
        [120, 245],
        [40, 245]
      ],
      page: 1
    },
    {
      text: "jane@example.com",
      confidence: 0.91,
      box: [
        [140, 220],
        [300, 220],
        [300, 245],
        [140, 245]
      ],
      page: 1
    }
  ],
  pages: [
    {
      page: 1,
      width: 1000,
      height: 1000,
      text: []
    }
  ]
};
ocr.pages[0]!.text = ocr.text;

describe("TemplateService dynamic detection", () => {
  const service = new TemplateService();

  beforeAll(async () => {
    await service.initialize();
  });

  it("detects fields at runtime from uploaded form OCR", () => {
    const result = service.extract(ocr);

    expect(result.template.id).toBe("dynamic-form");
    expect(result.template.name).toMatch(/claim form/i);

    const labels = Object.values(result.template.fields).map(
      (field) => field.label
    );
    expect(labels.some((label) => /policy/i.test(label))).toBe(true);
    expect(labels.some((label) => /name/i.test(label))).toBe(true);
    expect(labels.some((label) => /email/i.test(label))).toBe(true);

    const values = Object.values(result.fields);
    expect(values).toContain("P/123456/01");
    expect(values).toContain("Jane Doe");
    expect(values).toContain("jane@example.com");
  });
});
