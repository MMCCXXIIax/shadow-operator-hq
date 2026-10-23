import { and, eq, inArray } from "drizzle-orm";
import { db, evidenceItemsTable } from "@workspace/db";
import {
  reportCoverage,
  scanReportBodySchema,
  type ReportStatus,
  type ScanReportBody,
  type ScanReportCoverageEntry,
} from "@workspace/api-zod/report";

export interface ReportGeneratorInfo {
  name: string;
  version: string;
  /** False when no approved provider exists: the report can never be complete. */
  available: boolean;
}

export interface ReportValidationInput {
  userId: string;
  leadId: number | null;
  body: ScanReportBody;
  generator: ReportGeneratorInfo;
}

export type ReportValidation =
  | {
      ok: true;
      body: ScanReportBody;
      status: ReportStatus;
      coverage: ScanReportCoverageEntry[];
    }
  | { ok: false; problems: string[] };

/**
 * The gate every report passes before it is written.
 *
 * The contract in `@workspace/api-zod` proves the shape; this proves the
 * sources. A citation is only accepted when the evidence row exists, belongs to
 * the signed-in operator, and (when the report is attached to a creator) belongs
 * to that same creator. Anything else is refused rather than stored.
 */
export async function validateReport(input: ReportValidationInput): Promise<ReportValidation> {
  const parsed = scanReportBodySchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((issue) => `${issue.path.join(".") || "report"}: ${issue.message}`),
    };
  }

  const body = parsed.data;
  const problems: string[] = [];

  const evidenceIds = [...new Set(body.sections.flatMap((section) => section.findings.flatMap((finding) => finding.evidenceIds)))];

  if (evidenceIds.length > 0 && input.leadId === null) {
    problems.push("A report that cites evidence must be attached to a creator record.");
  } else if (evidenceIds.length > 0 && input.leadId !== null) {
    const owned = await db
      .select({ id: evidenceItemsTable.id })
      .from(evidenceItemsTable)
      .where(
        and(
          eq(evidenceItemsTable.userId, input.userId),
          eq(evidenceItemsTable.leadId, input.leadId),
          inArray(evidenceItemsTable.id, evidenceIds),
        ),
      );
    const ownedIds = new Set(owned.map((row) => row.id));
    const unavailable = evidenceIds.filter((id) => !ownedIds.has(id));
    if (unavailable.length > 0) {
      problems.push(
        `Evidence ${unavailable.join(", ")} is not available for this creator and account, so it cannot be cited.`,
      );
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  // Complete requires every section to be complete on its own terms, and the
  // generator must be a real one. A missing provider can never be masked by
  // empty sections that happen to parse.
  const everySectionComplete = body.sections.every((section) => section.status === "complete");
  const status: ReportStatus = input.generator.available && everySectionComplete ? "complete" : "incomplete";

  return { ok: true, body, status, coverage: reportCoverage(body.sections) };
}
