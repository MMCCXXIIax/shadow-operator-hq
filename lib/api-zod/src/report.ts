// The Creator Intelligence Report contract.
//
// This is the single definition of what a report may contain. It is used twice:
//   1. as a runtime gate before anything is written to `scan_reports`
//      (`artifacts/api-server/src/lib/report/validate.ts` adds the database
//      checks: every cited evidence id must be owned by the same user/creator);
//   2. as the shape the API returns (mirrored in `lib/api-spec/openapi.yaml`).
//
// Design rules encoded here, not just documented:
//   * Sections appear once, in the approved order.
//   * Every finding points at evidence by id — there is no free-floating claim.
//   * `complete` is impossible unless every required section is populated.
//   * A product concept is always a hypothesis; its existence never claims
//     commercial validation.
//   * Assumptions, limitations and findings are separate fields, so the UI can
//     never present an assumption as an observation.
//   * Metrics in an outreach draft must already exist in the findings it cites.
import * as zod from "zod";

export const reportSectionKeySchema = zod.enum([
  "creator_profile",
  "creator_potential",
  "audience_signals",
  "monetization_gap",
  "product_concepts",
  "recommended_opportunity",
  "outreach_draft",
]);
export type ReportSectionKey = zod.infer<typeof reportSectionKeySchema>;

// The approved section order. Persistence, API and UI all read this list.
export const REPORT_SECTION_KEYS = reportSectionKeySchema.options;

export const REPORT_SECTION_TITLES: Record<ReportSectionKey, string> = {
  creator_profile: "Creator Profile",
  creator_potential: "Creator Potential Assessment",
  audience_signals: "Audience Signals",
  monetization_gap: "Monetization-Gap Analysis",
  product_concepts: "Product Concepts",
  recommended_opportunity: "Recommended Opportunity",
  outreach_draft: "Type-B Outreach Draft",
};

export const reportStatusSchema = zod.enum(["incomplete", "complete"]);
export type ReportStatus = zod.infer<typeof reportStatusSchema>;

export const reportSectionStateSchema = zod.enum(["complete", "insufficient_evidence"]);
export type ReportSectionState = zod.infer<typeof reportSectionStateSchema>;

export const reportConfidenceSchema = zod.enum(["high", "medium", "low"]);
export type ReportConfidence = zod.infer<typeof reportConfidenceSchema>;

export const reportPotentialVerdictSchema = zod.enum(["high", "medium", "low", "undetermined"]);
export type ReportPotentialVerdict = zod.infer<typeof reportPotentialVerdictSchema>;

export const reportProductFormatSchema = zod.enum([
  "template_pack",
  "mini_course",
  "cohort",
  "subscription",
  "guide",
  "toolkit",
  "service",
  "other",
]);
export type ReportProductFormat = zod.infer<typeof reportProductFormatSchema>;

export const scanReportFindingSchema = zod.object({
  // Stable within one report; product concepts and the outreach draft refer to
  // findings by this id, which is how findings and proposals stay linked.
  id: zod.string().min(1).max(40),
  statement: zod.string().min(1).max(2000),
  evidenceIds: zod.array(zod.number().int().positive()).min(1),
  confidence: reportConfidenceSchema,
  limitations: zod.array(zod.string().min(1)).default([]),
});
export type ScanReportFinding = zod.infer<typeof scanReportFindingSchema>;

export const scanReportProductConceptSchema = zod.object({
  id: zod.string().min(1).max(40),
  name: zod.string().min(1).max(120),
  format: reportProductFormatSchema,
  whoItServes: zod.string().min(1).max(300),
  rationale: zod.string().min(1).max(2000),
  findingIds: zod.array(zod.string().min(1)).min(1),
  // Fixed on purpose: a concept is a proposal, never a validated product.
  status: zod.literal("hypothesis"),
});
export type ScanReportProductConcept = zod.infer<typeof scanReportProductConceptSchema>;

export const scanReportRecommendationSchema = zod.object({
  conceptId: zod.string().min(1),
  rationale: zod.string().min(1).max(2000),
  findingIds: zod.array(zod.string().min(1)).min(1),
  assumptions: zod.array(zod.string().min(1)).default([]),
});
export type ScanReportRecommendation = zod.infer<typeof scanReportRecommendationSchema>;

export const scanReportOutreachSchema = zod.object({
  channel: zod.literal("instagram_dm"),
  body: zod.string().min(1).max(4000),
  findingIds: zod.array(zod.string().min(1)).min(1),
  claimsToVerify: zod.array(zod.string().min(1)).default([]),
});
export type ScanReportOutreach = zod.infer<typeof scanReportOutreachSchema>;

export const scanReportSectionSchema = zod.object({
  key: reportSectionKeySchema,
  title: zod.string().min(1),
  status: reportSectionStateSchema,
  // Required whenever the section is `insufficient_evidence`, forbidden
  // otherwise, so an empty section always explains itself.
  reason: zod.string().min(1).nullable().default(null),
  findings: zod.array(scanReportFindingSchema).default([]),
  assumptions: zod.array(zod.string().min(1)).default([]),
  limitations: zod.array(zod.string().min(1)).default([]),
  // Section-specific blocks. Each is only valid on its own section (enforced
  // below), so a verdict or a concept cannot leak into a profile section.
  verdict: reportPotentialVerdictSchema.nullable().default(null),
  concepts: zod.array(scanReportProductConceptSchema).default([]),
  recommended: scanReportRecommendationSchema.nullable().default(null),
  outreach: scanReportOutreachSchema.nullable().default(null),
});
export type ScanReportSection = zod.infer<typeof scanReportSectionSchema>;

const SECTION_REQUIREMENT: Record<ReportSectionKey, "findings" | "concepts" | "recommended" | "outreach"> = {
  creator_profile: "findings",
  creator_potential: "findings",
  audience_signals: "findings",
  monetization_gap: "findings",
  product_concepts: "concepts",
  recommended_opportunity: "recommended",
  outreach_draft: "outreach",
};

const METRIC_TOKEN = /\d[\d,.]*(?:%|k|m|K|M)?/g;

/** Metric-looking numbers ("1,200", "4.5k", "12%"), normalized for comparison. */
function metricTokens(text: string): string[] {
  const tokens = text.match(METRIC_TOKEN) ?? [];
  return tokens
    .map((token) => token.replace(/,/g, "").toLowerCase())
    .filter((token) => {
      const digits = (token.match(/\d/g) ?? []).length;
      return digits >= 2 || /[%km]$/.test(token);
    });
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export const scanReportBodySchema = zod
  .object({
    sections: zod.array(scanReportSectionSchema),
    limitations: zod.array(zod.string().min(1)).default([]),
  })
  .superRefine((body, ctx) => {
    const problems: Array<{ path: (string | number)[]; message: string }> = [];
    const fail = (path: (string | number)[], message: string) => problems.push({ path, message });

    // --- Section identity and order ---------------------------------------
    if (body.sections.length !== REPORT_SECTION_KEYS.length) {
      fail(["sections"], `A report needs exactly ${REPORT_SECTION_KEYS.length} sections.`);
    }
    body.sections.forEach((section, index) => {
      const expected = REPORT_SECTION_KEYS[index];
      if (section.key !== expected) {
        fail(["sections", index, "key"], `Section ${index + 1} must be "${expected}".`);
      }
      if (section.title !== REPORT_SECTION_TITLES[section.key]) {
        fail(["sections", index, "title"], `Section "${section.key}" must be titled "${REPORT_SECTION_TITLES[section.key]}".`);
      }
      // Section-specific blocks belong only to their own section.
      if (section.verdict !== null && section.key !== "creator_potential") {
        fail(["sections", index, "verdict"], "Only the Creator Potential Assessment carries a verdict.");
      }
      if (section.concepts.length > 0 && section.key !== "product_concepts") {
        fail(["sections", index, "concepts"], "Only the Product Concepts section carries concepts.");
      }
      if (section.recommended !== null && section.key !== "recommended_opportunity") {
        fail(["sections", index, "recommended"], "Only the Recommended Opportunity section carries a recommendation.");
      }
      if (section.outreach !== null && section.key !== "outreach_draft") {
        fail(["sections", index, "outreach"], "Only the Outreach Draft section carries a draft.");
      }
    });

    // --- A complete section must actually be populated --------------------
    body.sections.forEach((section, index) => {
      const requirement = SECTION_REQUIREMENT[section.key];
      const populated =
        requirement === "findings"
          ? section.findings.length > 0
          : requirement === "concepts"
            ? section.concepts.length > 0
            : requirement === "recommended"
              ? section.recommended !== null
              : section.outreach !== null;

      if (section.status === "complete" && !populated) {
        fail(["sections", index], `Section "${section.key}" is marked complete but has no content.`);
      }
      if (section.status === "complete" && section.reason !== null) {
        fail(["sections", index, "reason"], `Section "${section.key}" cannot be complete and carry a reason.`);
      }
      if (section.status === "insufficient_evidence" && section.reason === null) {
        fail(["sections", index, "reason"], `Section "${section.key}" must say why it has insufficient evidence.`);
      }
    });

    // --- Findings: unique ids --------------------------------------------
    const allFindings = body.sections.flatMap((section) => section.findings);
    const findingById = new Map<string, ScanReportFinding>();
    for (const finding of allFindings) {
      if (findingById.has(finding.id)) {
        fail(["sections"], `Finding id "${finding.id}" is used more than once.`);
      }
      findingById.set(finding.id, finding);
    }

    const requireFindings = (ids: string[], path: (string | number)[], label: string) => {
      for (const id of ids) {
        if (!findingById.has(id)) {
          fail(path, `${label} references unknown finding "${id}".`);
        }
      }
    };

    // --- Product concepts -------------------------------------------------
    const conceptSection = body.sections.find((section) => section.key === "product_concepts");
    const concepts = conceptSection?.concepts ?? [];
    if (conceptSection && conceptSection.status === "complete" && concepts.length !== 4) {
      fail(["sections", 4, "concepts"], "The Product Concepts section must contain exactly four concepts.");
    }
    if (concepts.length > 0 && concepts.length !== 4) {
      fail(["sections", 4, "concepts"], "The Product Concepts section must contain exactly four concepts.");
    }

    const conceptIds = new Set<string>();
    const conceptNames = new Set<string>();
    const conceptShapes = new Set<string>();
    concepts.forEach((concept, index) => {
      if (conceptIds.has(concept.id)) {
        fail(["sections", 4, "concepts", index, "id"], `Concept id "${concept.id}" is used more than once.`);
      }
      conceptIds.add(concept.id);
      if (conceptNames.has(normalize(concept.name))) {
        fail(["sections", 4, "concepts", index, "name"], `Concept "${concept.name}" is not distinct from another concept.`);
      }
      conceptNames.add(normalize(concept.name));
      const shape = `${concept.format}::${normalize(concept.whoItServes)}`;
      if (conceptShapes.has(shape)) {
        fail(["sections", 4, "concepts", index, "format"], `Concept "${concept.name}" duplicates an existing format/audience pair.`);
      }
      conceptShapes.add(shape);
      requireFindings(concept.findingIds, ["sections", 4, "concepts", index, "findingIds"], `Concept "${concept.name}"`);
    });

    // --- Recommendation ---------------------------------------------------
    const recommendation = body.sections.find((section) => section.key === "recommended_opportunity")?.recommended ?? null;
    if (recommendation) {
      if (!conceptIds.has(recommendation.conceptId)) {
        fail(
          ["sections", 5, "recommended", "conceptId"],
          `Recommended concept "${recommendation.conceptId}" is not one of the four concepts.`,
        );
      }
      requireFindings(recommendation.findingIds, ["sections", 5, "recommended", "findingIds"], "Recommendation");
    }

    // --- Outreach draft ---------------------------------------------------
    const outreach = body.sections.find((section) => section.key === "outreach_draft")?.outreach ?? null;
    if (outreach) {
      requireFindings(outreach.findingIds, ["sections", 6, "outreach", "findingIds"], "Outreach draft");
      const supported = new Set(
        outreach.findingIds
          .map((id) => findingById.get(id))
          .filter((finding): finding is ScanReportFinding => Boolean(finding))
          .flatMap((finding) => metricTokens(finding.statement)),
      );
      const unsupported = metricTokens(outreach.body).filter((token) => !supported.has(token));
      if (unsupported.length > 0) {
        fail(
          ["sections", 6, "outreach", "body"],
          `Outreach draft states metrics that no cited finding supports: ${[...new Set(unsupported)].join(", ")}.`,
        );
      }
    }

    // --- Potential verdict -------------------------------------------------
    const potential = body.sections.find((section) => section.key === "creator_potential");
    if (potential) {
      const verdict = potential.verdict ?? "undetermined";
      if (verdict !== "undetermined" && potential.findings.length < 2) {
        fail(["sections", 1, "verdict"], "A potential verdict needs at least two cited findings; otherwise it stays undetermined.");
      }
      if (verdict === "high" && !potential.findings.some((finding) => finding.confidence === "high")) {
        fail(["sections", 1, "verdict"], "A high potential verdict needs at least one high-confidence finding.");
      }
      if (potential.findings.length === 0 && verdict !== "undetermined") {
        fail(["sections", 1, "verdict"], "Without findings the potential verdict must be undetermined.");
      }
    }

    for (const problem of problems) {
      ctx.addIssue({ code: zod.ZodIssueCode.custom, path: problem.path, message: problem.message });
    }
  });

export type ScanReportBody = zod.infer<typeof scanReportBodySchema>;

export interface ScanReportBlockedBy {
  stageKey: string;
  code: string;
  message: string;
  detail: string;
}

/** Every section, explicitly empty, with one honest reason. Used when a run
 *  could not reach research at all — never for a partially researched report. */
export function insufficientEvidenceSections(reason: string): ScanReportSection[] {
  return REPORT_SECTION_KEYS.map((key) => ({
    key,
    title: REPORT_SECTION_TITLES[key],
    status: "insufficient_evidence" as const,
    reason,
    findings: [],
    assumptions: [],
    limitations: [],
    verdict: null,
    concepts: [],
    recommended: null,
    outreach: null,
  }));
}

export interface ScanReportCoverageEntry {
  sectionKey: ReportSectionKey;
  title: string;
  state: ReportSectionState;
  reason: string | null;
}

/** Derived, never stored — the sections themselves are the source of truth. */
export function reportCoverage(sections: ScanReportSection[]): ScanReportCoverageEntry[] {
  return sections.map((section) => ({
    sectionKey: section.key,
    title: section.title,
    state: section.status,
    reason: section.reason,
  }));
}
