import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetScan,
  getGetScanQueryKey,
  useRetryScan,
  getListScansQueryKey,
  useGetInstagramStatus,
  getGetInstagramStatusQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SCAN_STATUS_STYLES } from "@/components/new-scan-panel";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

function StageIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />;
  if (status === "running") return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />;
  if (status === "failed") return <XCircle className="size-4 shrink-0 text-destructive" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground/40" />;
}

export default function ScanDetail() {
  const { id } = useParams();
  const scanId = Number(id);
  const queryClient = useQueryClient();

  const { data: scan, isLoading } = useGetScan(scanId, {
    query: {
      enabled: Number.isFinite(scanId),
      queryKey: getGetScanQueryKey(scanId),
      // Progress is persisted server-side, so polling is the whole live-update
      // mechanism while a run is in flight.
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "queued" || status === "running" ? 1500 : false;
      },
    },
  });

  const { data: integration } = useGetInstagramStatus({
    query: { queryKey: getGetInstagramStatusQueryKey() },
  });

  const retry = useRetryScan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetScanQueryKey(scanId) });
        queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Command Center
        </Link>
        <p className="text-muted-foreground">This scan could not be found.</p>
      </div>
    );
  }

  const missingChecks = (integration?.checks ?? []).filter((check) => !check.present);
  const isStopped = scan.status === "blocked" || scan.status === "failed";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Command Center
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight" data-testid="scan-title">
              @{scan.normalizedHandle}
            </h1>
            <p className="text-sm text-muted-foreground">
              Intelligence scan #{scan.id} · attempt {scan.attempt} · {scan.input}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`border-0 capitalize ${SCAN_STATUS_STYLES[scan.status] ?? ""}`}
              data-testid="scan-status"
            >
              {scan.status}
            </Badge>
            {scan.leadId && (
              <Link
                href={`/leads/${scan.leadId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open creator record
                <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {isStopped && (
        <div
          className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
          data-testid="scan-blocker"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {scan.errorCode === "instagram_not_configured"
                  ? "Instagram data access is not configured"
                  : "The scan could not complete"}
              </p>
              <p className="text-sm">{scan.errorMessage}</p>
            </div>
          </div>

          {missingChecks.length > 0 && (
            <div className="space-y-1 text-xs">
              <p className="font-semibold uppercase tracking-wide">Missing server-side configuration</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {missingChecks.map((check) => (
                  <li key={check.name}>
                    <code className="font-mono">{check.name}</code> — {check.description}
                  </li>
                ))}
              </ul>
              {integration?.nextStep && <p className="pt-1">{integration.nextStep}</p>}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => retry.mutate({ id: scanId })}
            disabled={retry.isPending}
            data-testid="retry-scan-button"
          >
            {retry.isPending ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-3.5" />
            )}
            Retry scan
          </Button>
          {retry.error && <p className="text-xs text-destructive">{retry.error.message}</p>}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {scan.stages.map((stage) => (
            <div
              key={stage.key}
              className="flex items-start gap-3 rounded-lg px-2 py-2.5"
              data-testid={`stage-${stage.key}`}
              data-stage-status={stage.status}
            >
              <StageIcon status={stage.status} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${stage.status === "pending" || stage.status === "skipped" ? "text-muted-foreground" : "font-medium"}`}>
                  {stage.label}
                </p>
                {stage.detail && <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>}
              </div>
              <span className="shrink-0 text-xs capitalize text-muted-foreground">{stage.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
