import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, scanJobsTable, type ScanJob } from "@workspace/db";
import {
  CreateScanBody,
  GetScanParams,
  GetScanReportParams,
  GetScanReportResponse,
  GetScanResponse,
  ListScansResponse,
  RetryScanParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/route-auth";
import { normalizeInstagramHandle } from "../lib/instagram/handle";
import { initialStages } from "../lib/scan/stages";
import { runScanJob } from "../lib/scan/runner";
import { getLatestReport } from "../lib/report/persist";

const router: IRouter = Router();

function serializeScan(job: ScanJob) {
  return {
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

router.get("/scans", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const scans = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.userId, userId))
    .orderBy(desc(scanJobsTable.createdAt), desc(scanJobsTable.id))
    .limit(25);

  res.json(ListScansResponse.parse(scans.map(serializeScan)));
});

router.post("/scans", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter an Instagram handle or profile URL." });
    return;
  }

  const normalizedHandle = normalizeInstagramHandle(parsed.data.handle);
  if (!normalizedHandle) {
    res.status(400).json({
      error: "That is not a usable Instagram handle or profile URL. Use e.g. @creator or https://instagram.com/creator.",
    });
    return;
  }

  const [scan] = await db
    .insert(scanJobsTable)
    .values({
      userId,
      input: parsed.data.handle.trim(),
      normalizedHandle,
      status: "queued",
      stages: initialStages(),
    })
    .returning();

  res.status(201).json(GetScanResponse.parse(serializeScan(scan)));

  // The response is already sent; the run persists its own progress and any
  // failure, so the client polls the scan instead of holding the request open.
  void runScanJob(scan.id);
});

router.get("/scans/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = GetScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scan] = await db
    .select()
    .from(scanJobsTable)
    .where(and(eq(scanJobsTable.id, params.data.id), eq(scanJobsTable.userId, userId)));

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.json(GetScanResponse.parse(serializeScan(scan)));
});

router.post("/scans/:id/retry", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = RetryScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(scanJobsTable)
    .where(and(eq(scanJobsTable.id, params.data.id), eq(scanJobsTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  if (existing.status === "completed") {
    res.status(409).json({ error: "This scan is already complete." });
    return;
  }

  const [scan] = await db
    .update(scanJobsTable)
    .set({
      status: "queued",
      currentStage: null,
      stages: initialStages(),
      errorCode: null,
      errorMessage: null,
      attempt: existing.attempt + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(scanJobsTable.id, params.data.id), eq(scanJobsTable.userId, userId)))
    .returning();

  res.json(GetScanResponse.parse(serializeScan(scan)));

  void runScanJob(scan.id);
});

// The report for the newest attempt. A report is only ever `complete` if every
// section passed validation against evidence the same account owns; otherwise
// it is `incomplete` and names the missing sections and blocker.
router.get("/scans/:id/report", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = GetScanReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scan] = await db
    .select({ id: scanJobsTable.id })
    .from(scanJobsTable)
    .where(and(eq(scanJobsTable.id, params.data.id), eq(scanJobsTable.userId, userId)));

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const report = await getLatestReport(scan.id, userId);
  if (!report) {
    res.status(404).json({ error: "No report has been recorded for this scan yet." });
    return;
  }

  res.json(GetScanReportResponse.parse(report));
});

export default router;
