import type { EvidenceItem } from "@workspace/db";
import type { ScanReportBody } from "@workspace/api-zod/report";

/**
 * The report generation seam.
 *
 * Persistence (`persist.ts`) and validation (`validate.ts`) know nothing about
 * who produces a report. A future Instagram/Meta research adapter and an
 * approved AI provider plug in here by implementing `ReportGenerator` and being
 * returned from `getReportGenerator()`; the stage machine, the contract, the
 * endpoint and the UI do not change.
 *
 * Nothing is generated today: no provider has been approved. `generateReport`
 * therefore resolves to a typed outcome — it never throws, never invents
 * sections and can never produce a complete report.
 */
export interface ReportGenerationInput {
  scanJobId: number;
  userId: string;
  leadId: number | null;
  normalizedHandle: string;
  /** Evidence rows already collected for this creator. */
  evidence: EvidenceItem[];
}

export interface ReportGenerator {
  name: string;
  version: string;
  generate(input: ReportGenerationInput): Promise<ScanReportBody>;
}

export type ReportGenerationResult =
  | {
      ok: true;
      generator: { name: string; version: string; available: true };
      body: ScanReportBody;
    }
  | {
      ok: false;
      code: "report_generator_unavailable" | "report_generation_failed";
      message: string;
      detail: string;
    };

/**
 * No approved provider yet. Returning `null` keeps the pipeline honest: the
 * runner turns this into a typed blocker instead of an exception.
 */
export function getReportGenerator(): ReportGenerator | null {
  return null;
}

export async function generateReport(input: ReportGenerationInput): Promise<ReportGenerationResult> {
  const generator = getReportGenerator();

  if (!generator) {
    return {
      ok: false,
      code: "report_generator_unavailable",
      message:
        "No research/AI provider is configured, so no report sections can be produced. Nothing was inferred or filled in.",
      detail: "Report generator unavailable.",
    };
  }

  try {
    const body = await generator.generate(input);
    return {
      ok: true,
      generator: { name: generator.name, version: generator.version, available: true },
      body,
    };
  } catch (error) {
    return {
      ok: false,
      code: "report_generation_failed",
      message: `The report generator failed: ${error instanceof Error ? error.message : String(error)}`,
      detail: "Report generation failed.",
    };
  }
}
