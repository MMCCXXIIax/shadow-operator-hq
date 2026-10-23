import {
  getGetScanReportQueryKey,
  useGetScanReport,
  type EvidenceItem,
  type ScanReportSection,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  low: "bg-secondary text-foreground",
};

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: "observed, not verified",
  creator_stated: "creator stated",
  verified: "verified",
  disputed: "disputed",
};

const GENERATOR_LABELS: Record<string, string> = {
  not_run: "No generation was run",
  unavailable: "No report generator is configured",
};

const FORMAT_LABELS: Record<string, string> = {
  template_pack: "Template pack",
  mini_course: "Mini course",
  cohort: "Cohort",
  subscription: "Subscription",
  guide: "Guide",
  toolkit: "Toolkit",
  service: "Service",
  other: "Other",
};

function evidenceLabel(item: EvidenceItem): string {
  return item.sourceDescription ?? item.sourceUrl ?? `Evidence #${item.id}`;
}

function EvidenceChips({ ids, evidenceById }: { ids: number[]; evidenceById: Map<number, EvidenceItem> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const item = evidenceById.get(id);
        if (!item) {
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive"
            >
              Evidence #{id} no longer available
            </span>
          );
        }

        const label = evidenceLabel(item);
        const caption = `${VERIFICATION_LABELS[item.verificationStatus] ?? item.verificationStatus} · ${format(
          new Date(item.capturedAt),
          "MMM d, yyyy",
        )}`;

        const body = (
          <>
            {item.sourceUrl && <ExternalLink className="size-3 shrink-0" />}
            <span className="truncate">{label}</span>
            <span className="text-muted-foreground">· {caption}</span>
          </>
        );

        return item.sourceUrl ? (
          <a
            key={id}
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[11px] hover:bg-accent/50"
            title={`${label} — ${caption}`}
          >
            {body}
          </a>
        ) : (
          <span
            key={id}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[11px]"
            title={`${label} — ${caption}`}
          >
            {body}
          </span>
        );
      })}
    </div>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SectionBody({
  section,
  evidenceById,
  findingStatements,
}: {
  section: ScanReportSection;
  evidenceById: Map<number, EvidenceItem>;
  findingStatements: Map<string, string>;
}) {
  return (
    <>
      {section.key === "creator_potential" && section.verdict && (
        <p className="text-sm">
          <span className="text-muted-foreground">Potential: </span>
          <span className="font-medium capitalize">{section.verdict}</span>
        </p>
      )}

      {section.findings.length > 0 && (
        <ul className="space-y-2">
          {section.findings.map((finding) => (
            <li key={finding.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{finding.statement}</p>
                <Badge
                  variant="outline"
                  className={`border-0 text-[10px] ${CONFIDENCE_STYLES[finding.confidence] ?? ""}`}
                >
                  {finding.confidence} confidence
                </Badge>
              </div>
              <EvidenceChips ids={finding.evidenceIds} evidenceById={evidenceById} />
              <StringList title="Limitations" items={finding.limitations} />
            </li>
          ))}
        </ul>
      )}

      {section.concepts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {section.concepts.map((concept) => (
            <div key={concept.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{concept.name}</p>
                <Badge variant="outline" className="border-0 bg-secondary text-[10px] capitalize">
                  hypothesis
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {FORMAT_LABELS[concept.format] ?? concept.format} · {concept.whoItServes}
              </p>
              <p className="mt-1.5 text-sm">{concept.rationale}</p>
              <StringList
                title="Based on findings"
                items={concept.findingIds.map((id) => findingStatements.get(id) ?? `Finding ${id}`)}
              />
            </div>
          ))}
        </div>
      )}

      {section.recommended && (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Recommended concept: </span>
            <span className="font-medium">
              {section.concepts.find((concept) => concept.id === section.recommended?.conceptId)?.name ??
                section.recommended.conceptId}
            </span>
          </p>
          <p className="mt-1 text-sm">{section.recommended.rationale}</p>
          <StringList
            title="Based on findings"
            items={section.recommended.findingIds.map((id) => findingStatements.get(id) ?? `Finding ${id}`)}
          />
          <StringList title="Assumptions" items={section.recommended.assumptions} />
        </div>
      )}

      {section.outreach && (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Instagram DM · type-B partnership
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm">{section.outreach.body}</p>
          <StringList
            title="Based on findings"
            items={section.outreach.findingIds.map((id) => findingStatements.get(id) ?? `Finding ${id}`)}
          />
          <StringList title="Verify before sending" items={section.outreach.claimsToVerify} />
        </div>
      )}

      <StringList title="Assumptions" items={section.assumptions} />
      <StringList title="Limitations" items={section.limitations} />
    </>
  );
}

/**
 * Renders a persisted Creator Intelligence Report exactly as it was validated.
 * An incomplete report is labelled as such and lists what is missing; it is
 * never presented as a finished research report.
 */
export function ScanReportPanel({ scanId, scanStatus }: { scanId: number; scanStatus: string }) {
  const isRunning = scanStatus === "queued" || scanStatus === "running";

  const { data: report, isLoading, error } = useGetScanReport(scanId, {
    query: {
      queryKey: getGetScanReportQueryKey(scanId),
      retry: false,
      refetchInterval: isRunning ? 2000 : false,
    },
  });

  // No report recorded for this scan is a normal state, not an error: the scan
  // blocker above already explains why nothing was produced.
  if (error && (error as { status?: number }).status === 404) return null;
  if (error) return <p className="text-sm text-destructive">The report could not be loaded.</p>;
  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!report) return null;

  const evidenceById = new Map(report.evidence.map((item) => [item.id, item]));
  const findingStatements = new Map(
    report.sections.flatMap((section) => section.findings.map((finding) => [finding.id, finding.statement] as const)),
  );
  const missingSections = report.coverage.filter((entry) => entry.state !== "complete");
  // A blocked run gives every section the same reason; show it once instead of
  // repeating it seven times.
  const showPerSectionReason = new Set(missingSections.map((entry) => entry.reason ?? "")).size > 1;
  const renderedSections =
    report.status === "complete" ? report.sections : report.sections.filter((section) => section.status === "complete");

  return (
    <Card data-testid="scan-report">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Creator Intelligence Report</CardTitle>
            <CardDescription>
              Attempt {report.attempt} ·{" "}
              {GENERATOR_LABELS[report.generator] ?? `Generator ${report.generator} ${report.generatorVersion}`}
              {report.generatedAt ? ` · generated ${format(new Date(report.generatedAt), "MMM d, yyyy HH:mm")}` : ""}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 border-0 capitalize ${
              report.status === "complete"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            }`}
            data-testid="report-status"
          >
            {report.status === "complete" ? "complete" : "incomplete"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {report.status !== "complete" && (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Incomplete — this is not a research report</p>
                <p className="text-sm">
                  {report.blockedBy?.message ??
                    "Not every section could be populated from evidence owned by this account."}
                </p>
              </div>
            </div>
            {missingSections.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-6 text-xs">
                {missingSections.map((entry) => (
                  <li key={entry.sectionKey}>
                    <span className="font-medium">{entry.title}</span>
                    {showPerSectionReason && entry.reason ? ` — ${entry.reason}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {report.missingEvidenceIds.length > 0 && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {report.missingEvidenceIds.length} cited source
            {report.missingEvidenceIds.length === 1 ? " is" : "s are"} no longer available (evidence #
            {report.missingEvidenceIds.join(", #")}). The findings are left as written — re-check them before relying on
            them.
          </p>
        )}

        {renderedSections.map((section) => (
          <section key={section.key} className="space-y-2 border-t border-border/60 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <span className="shrink-0 text-[11px] capitalize text-muted-foreground">
                {section.status === "complete" ? "complete" : "insufficient evidence"}
              </span>
            </div>

            {section.status === "insufficient_evidence" ? (
              <p className="text-xs text-muted-foreground">
                {section.reason ?? "No evidence was available for this section."}
              </p>
            ) : (
              <SectionBody section={section} evidenceById={evidenceById} findingStatements={findingStatements} />
            )}
          </section>
        ))}

        <StringList title="Report limitations" items={report.limitations} />

        {report.status === "complete" && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Every section cites evidence owned by this account. Product concepts remain hypotheses, not validated
            products.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
