import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  evidenceItemsTable,
  scanReportsTable,
  type EvidenceItem,
  type ScanJob,
} from "@workspace/db";
import {
  insufficientEvidenceSections,
  reportCoverage,
  scanReportBodySchema,
  type ScanReportBlockedBy,
  type ScanReportBody,
} from "@workspace/api-zod/report";
import { validateReport } from "./validate";

// Honest generator provenance. Neither value is a stand-in for a real provider.
export const REPORT_GENERATORS = {
  /** The run stopped before generation could be attempted. */
  notRun: "not_run",
  /** Generation was reached but no provider is configured. */
  unavailable: "unavailable",
} as const;

export interface SaveReportInput {
  scanJob: ScanJob;
  body: ScanReportBody;
  generator: { name: string; version: string; available: boolean };
  blockedBy?: ScanReportBlockedBy | null;
  generatedAt?: Date | null;
}

function reportValues(scanJob: ScanJob, patch: {
  status: "incomplete" | "complete";
  generator: string;
  generatorVersion: string;
  body: ScanReportBody;
  blockedBy: ScanReportBlockedBy | null;
  generatedAt: Date | null;
}) {
  return {
    scanJobId: scanJob.id,
    userId: scanJob.userId,
    leadId: scanJob.leadId,
    attempt: scanJob.attempt,
    status: patch.status,
    generator: patch.generator,
    generatorVersion: patch.generatorVersion,
    sections: patch.body.sections,
    limitations: patch.body.limitations,
    blockedBy: patch.blockedBy,
    generatedAt: patch.generatedAt,
    updatedAt: new Date(),
  };
}

/**
 * Validates and persists one report for one scan attempt.
 *
 * The (scan_job_id, attempt) unique index means a rerun of the same attempt
 * replaces only that attempt's row: retrying a scan bumps `attempt`, so an
 * earlier attempt's report is never overwritten. Throws when the report does not
 * validate — an invalid report is never stored.
 */
export async function saveReport(input: SaveReportInput): Promise<void> {
  const validation = await validateReport({
    userId: input.scanJob.userId,
    leadId: input.scanJob.leadId,
    body: input.body,
    generator: input.generator,
  });

  if (!validation.ok) {
    throw new Error(`Report rejected: ${validation.problems.join(" ")}`);
  }

  const values = reportValues(input.scanJob, {
    status: validation.status,
    generator: input.generator.name,
    generatorVersion: input.generator.version,
    body: validation.body,
    blockedBy: input.blockedBy ?? null,
    generatedAt: input.generatedAt ?? null,
  });

  await db
    .insert(scanReportsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [scanReportsTable.scanJobId, scanReportsTable.attempt],
      set: {
        status: values.status,
        generator: values.generator,
        generatorVersion: values.generatorVersion,
        sections: values.sections,
        limitations: values.limitations,
        blockedBy: values.blockedBy,
        generatedAt: values.generatedAt,
        updatedAt: values.updatedAt,
      },
    });
}

/**
 * Records that this attempt produced no research, and why.
 *
 * Every section is explicitly `insufficient_evidence` with the blocker as its
 * reason, so nothing here can be read as a partially researched report.
 */
export async function saveBlockedReport(scanJob: ScanJob, blockedBy: ScanReportBlockedBy): Promise<void> {
  const body = scanReportBodySchema.parse({
    sections: insufficientEvidenceSections(blockedBy.message),
    limitations: [],
  });

  await saveReport({
    scanJob,
    body,
    generator: { name: REPORT_GENERATORS.notRun, version: "0", available: false },
    blockedBy,
    generatedAt: null,
  });
}

function serializeEvidence(item: EvidenceItem) {
  return {
    ...item,
    capturedAt: item.capturedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * Reads the latest attempt's report and resolves its citations against the
 * live evidence rows — provenance is referenced, never copied into the report.
 */
export async function getLatestReport(scanJobId: number, userId: string) {
  const [row] = await db
    .select()
    .from(scanReportsTable)
    .where(and(eq(scanReportsTable.scanJobId, scanJobId), eq(scanReportsTable.userId, userId)))
    .orderBy(desc(scanReportsTable.attempt), desc(scanReportsTable.id))
    .limit(1);

  if (!row) return null;

  const body = scanReportBodySchema.parse({
    sections: row.sections,
    limitations: row.limitations,
  });

  const evidenceIds = [...new Set(body.sections.flatMap((section) => section.findings.flatMap((finding) => finding.evidenceIds)))];

  const evidence =
    evidenceIds.length > 0
      ? await db
          .select()
          .from(evidenceItemsTable)
          .where(and(eq(evidenceItemsTable.userId, userId), inArray(evidenceItemsTable.id, evidenceIds)))
      : [];

  const resolved = new Set(evidence.map((item) => item.id));
  const missingEvidenceIds = evidenceIds.filter((id) => !resolved.has(id));

  return {
    id: row.id,
    scanJobId: row.scanJobId,
    userId: row.userId,
    leadId: row.leadId,
    attempt: row.attempt,
    status: row.status,
    generator: row.generator,
    generatorVersion: row.generatorVersion,
    sections: body.sections,
    limitations: body.limitations,
    coverage: reportCoverage(body.sections),
    blockedBy: (row.blockedBy as ScanReportBlockedBy | null) ?? null,
    evidence: evidence.sort((a, b) => a.id - b.id).map(serializeEvidence),
    missingEvidenceIds,
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
