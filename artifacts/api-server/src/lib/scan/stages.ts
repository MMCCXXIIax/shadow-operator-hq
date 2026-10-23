import type { ScanStageState } from "@workspace/db";

// The approved scan workflow, in order. Shared vocabulary for the runner, the
// API response and the progress UI.
export const SCAN_STAGE_DEFINITIONS: ReadonlyArray<{ key: ScanStageState["key"]; label: string }> = [
  { key: "resolve_profile", label: "Resolving profile" },
  { key: "collect_evidence", label: "Collecting public evidence" },
  { key: "analyze_signals", label: "Analyzing audience signals" },
  { key: "monetization_gap", label: "Evaluating monetization opportunities" },
  { key: "product_concepts", label: "Generating product concepts" },
  { key: "outreach_draft", label: "Preparing outreach" },
  { key: "report_ready", label: "Report ready" },
];

export function initialStages(): ScanStageState[] {
  return SCAN_STAGE_DEFINITIONS.map(({ key, label }) => ({
    key,
    label,
    status: "pending" as const,
    detail: null,
  }));
}
