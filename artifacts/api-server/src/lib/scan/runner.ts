import { and, eq, sql } from "drizzle-orm";
import {
  db,
  leadsTable,
  scanJobsTable,
  type ScanJob,
  type ScanStageKey,
  type ScanStageState,
} from "@workspace/db";
import { instagramConfigStatus } from "../instagram/config";
import { saveBlockedReport } from "../report/persist";
import { initialStages } from "./stages";

async function persist(jobId: number, patch: Partial<typeof scanJobsTable.$inferInsert>): Promise<void> {
  await db
    .update(scanJobsTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(scanJobsTable.id, jobId));
}

// A stage that could not run marks itself failed and leaves every later stage
// skipped: the report is never presented as complete when a step was missing.
async function block(
  job: ScanJob,
  stages: ScanStageState[],
  stageKey: ScanStageKey,
  error: { code: string; message: string; detail: string },
): Promise<void> {
  for (const stage of stages) {
    if (stage.key === stageKey) {
      stage.status = "failed";
      stage.detail = error.detail;
    } else if (stage.status === "pending") {
      stage.status = "skipped";
    }
  }

  await persist(job.id, {
    status: "blocked",
    currentStage: stageKey,
    stages,
    errorCode: error.code,
    errorMessage: error.message,
  });

  // Every attempt leaves a durable, explicitly incomplete report record saying
  // what could not be produced. It is never a partially researched report, and
  // a failure to write it must not wedge the scan state machine.
  await saveBlockedReport(job, { stageKey, ...error }).catch(() => undefined);
}

/**
 * Runs a scan job through the approved stage list, persisting each transition.
 *
 * Only the parts that genuinely have a data source are executed. Today that is
 * profile resolution against the operator's own records; external research needs
 * the Meta adapter, and until it exists the scan stops at stage 1 with a typed
 * blocker instead of producing an unsourced report.
 */
export async function runScanJob(jobId: number): Promise<void> {
  const [job] = await db.select().from(scanJobsTable).where(eq(scanJobsTable.id, jobId));
  if (!job) return;

  const stages = initialStages();

  try {
    await persist(jobId, {
      status: "running",
      currentStage: "resolve_profile",
      stages,
      errorCode: null,
      errorMessage: null,
    });

    // --- Stage 1: resolve the profile ------------------------------------
    const resolveStage = stages.find((stage) => stage.key === "resolve_profile");
    if (resolveStage) resolveStage.status = "running";
    await persist(jobId, { stages });

    // Reuse the existing creator record for this handle. This is a lookup in the
    // operator's own data, so it works before any external integration exists —
    // and it is how duplicate creator records are avoided.
    const [existing] = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.userId, job.userId),
          sql`lower(${leadsTable.instagramHandle}) = ${job.normalizedHandle}`,
        ),
      );

    if (existing) {
      await persist(jobId, { leadId: existing.id });
      // Keep the in-memory row in step so the blocked report links to the creator.
      job.leadId = existing.id;
    }

    const config = instagramConfigStatus();
    const missing = config.checks.filter((check) => !check.present).map((check) => check.name);

    if (!config.configured) {
      await block(job, stages, "resolve_profile", {
        code: "instagram_not_configured",
        message: `Missing server-side configuration${
          missing.length > 0 ? `: ${missing.join(", ")}` : ""
        }. Profile resolution, evidence collection and every later stage cannot run without a supported data source.`,
        detail: "No supported data source is connected.",
      });
      return;
    }

    // Credentials alone are not a data source: the Business Discovery adapter is
    // still to be built, and saying so is better than returning a thin report.
    await block(job, stages, "resolve_profile", {
      code: "research_adapter_pending",
      message:
        "Meta credentials are present, but the Instagram Business Discovery research adapter is not implemented yet, so no profile or content data can be retrieved.",
      detail: "Research adapter not implemented.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Never let a thrown error leave a job stuck in `running`.
    await persist(jobId, {
      status: "failed",
      errorCode: "scan_error",
      errorMessage: message,
      stages,
    }).catch(() => undefined);
  }
}

export type { ScanJob };
