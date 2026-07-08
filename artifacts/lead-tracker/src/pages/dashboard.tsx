import { useGetLeadStats, getGetLeadStatsQueryKey, useListFollowups, getListFollowupsQueryKey, type FollowUp } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowUpCard } from "@/components/follow-up-card";
import { AnimatePresence, motion } from "framer-motion";

function FollowUpColumn({
  title,
  count,
  items,
  variant,
  emptyLabel,
}: {
  title: string;
  count: number;
  items: FollowUp[];
  variant: "overdue" | "today" | "upcoming";
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <h2 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2 text-foreground">
          <span className={`w-2 h-2 rounded-full ${variant === "overdue" && count > 0 ? "bg-destructive animate-pulse" : "bg-muted"}`} />
          {title}
        </h2>
        <span className="text-xs font-bold text-muted-foreground">{count} tasks</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {count === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border/60 bg-card/50 flex flex-col items-center text-center">
            <CheckCircle2 className="w-6 h-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-semibold text-muted-foreground">{emptyLabel}</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((f) => (
              <motion.div key={f.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <FollowUpCard followUp={f} variant={variant} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetLeadStats({ query: { queryKey: getGetLeadStatsQueryKey() } });
  const { data: followUps, isLoading: followUpsLoading } = useListFollowups({ query: { queryKey: getListFollowupsQueryKey() } });

  const isLoading = statsLoading || followUpsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Loading pipeline statistics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const overdueCount = followUps?.overdue?.length ?? 0;
  const todayCount = followUps?.today?.length ?? 0;
  const upcomingCount = followUps?.upcoming?.length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">Pipeline health, outreach metrics, and follow-up urgency</p>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calls Booked</CardTitle>
            <Phone className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.callsBooked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Priority Score</CardTitle>
            <Target className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-baseline gap-2">
              {stats.avgPriorityScore.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground">/ 10</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up urgency board */}
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-4">Follow-Up Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FollowUpColumn title="Overdue" count={overdueCount} items={followUps?.overdue ?? []} variant="overdue" emptyLabel="Caught up" />
          <FollowUpColumn title="Due Today" count={todayCount} items={followUps?.today ?? []} variant="today" emptyLabel="Nothing due today" />
          <FollowUpColumn title="Upcoming" count={upcomingCount} items={followUps?.upcoming ?? []} variant="upcoming" emptyLabel="Nothing scheduled" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Niche Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {stats.nicheBreakdown.map((niche) => (
                <div key={niche.niche ?? "unspecified"} className="flex items-center">
                  <div className="w-full flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{niche.niche ?? "Unspecified"}</span>
                      <span className="text-sm text-muted-foreground">{niche.count}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(niche.count / stats.totalLeads) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {stats.nicheBreakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Outreach Funnel</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {stats.dmStatusBreakdown.map((status) => (
                <div key={status.dmStatus} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="font-medium text-sm">{status.dmStatus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{status.count}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {stats.totalLeads > 0 ? Math.round((status.count / stats.totalLeads) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
              {stats.dmStatusBreakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Pipeline Stage</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {stats.statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${s.status === "won" ? "bg-emerald-500" : s.status === "lost" ? "bg-slate-400" : "bg-primary"}`} />
                    <span className="font-medium text-sm capitalize">{s.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{s.count}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {stats.totalLeads > 0 ? Math.round((s.count / stats.totalLeads) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
              {stats.statusBreakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
