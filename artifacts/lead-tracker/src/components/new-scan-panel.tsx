import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateScan,
  useListScans,
  getListScansQueryKey,
  useGetInstagramStatus,
  getGetInstagramStatusQueryKey,
  type ScanJob,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Loader2, Radar } from "lucide-react";
import { format } from "date-fns";

export const SCAN_STATUS_STYLES: Record<string, string> = {
  queued: "bg-secondary text-foreground",
  running: "bg-primary/15 text-primary",
  blocked: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/15 text-destructive",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

function RecentScanRow({ scan }: { scan: ScanJob }) {
  return (
    <Link
      href={`/scans/${scan.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-accent/50"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">@{scan.normalizedHandle}</span>
        <Badge variant="outline" className={`border-0 text-[10px] capitalize ${SCAN_STATUS_STYLES[scan.status] ?? ""}`}>
          {scan.status}
        </Badge>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {format(new Date(scan.createdAt), "MMM d, HH:mm")}
      </span>
    </Link>
  );
}

export function NewScanPanel() {
  const [handle, setHandle] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: scans } = useListScans({ query: { queryKey: getListScansQueryKey() } });
  const { data: integration } = useGetInstagramStatus({
    query: { queryKey: getGetInstagramStatusQueryKey() },
  });

  const createScan = useCreateScan({
    mutation: {
      onSuccess: (scan) => {
        queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
        setHandle("");
        setLocation(`/scans/${scan.id}`);
      },
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = handle.trim();
    if (!value) return;
    createScan.mutate({ data: { handle: value } });
  }

  const recent = (scans ?? []).slice(0, 5);

  return (
    <Card data-testid="new-scan-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radar className="size-4 text-primary" />
          New Intelligence Scan
        </CardTitle>
        <CardDescription>
          Enter one Instagram handle or profile URL. ShadowOS resolves the creator, collects what it can
          actually verify, and builds the report — no manual profile entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@creator or https://instagram.com/creator"
            aria-label="Instagram handle or profile URL"
            data-testid="scan-handle-input"
            className="flex-1"
          />
          <Button type="submit" disabled={!handle.trim() || createScan.isPending} data-testid="analyze-creator-button">
            {createScan.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 size-4" />
            )}
            Analyze Creator
          </Button>
        </form>

        {createScan.error && (
          <p className="text-sm text-destructive" data-testid="scan-form-error">
            {createScan.error.data?.error ?? createScan.error.message}
          </p>
        )}

        {integration && !integration.configured && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Instagram data access is not configured. Scans will stop at profile resolution and say so —
              they will not produce a report from guesses.
            </span>
          </div>
        )}

        {recent.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent scans</p>
            <div className="space-y-1.5">
              {recent.map((scan) => (
                <RecentScanRow key={scan.id} scan={scan} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
