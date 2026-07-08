import { useGetLeadStats, getGetLeadStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Target, ArrowUpRight, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetLeadStats({ query: { queryKey: getGetLeadStatsQueryKey() } });

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">Pipeline health and outreach metrics</p>
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

      <a
        href="https://snipr.is/followflow"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-followflow-dashboard"
        className="group flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 px-6 py-5 transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Bell className="size-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              Never miss a follow-up
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 rounded px-1.5 py-0.5">New</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create your free FollowFlow account to automate follow-up tracking alongside your leads.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-sm font-medium text-primary hidden sm:block">Get started free</span>
          <ArrowUpRight className="size-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
        </div>
      </a>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Niche Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {stats.nicheBreakdown.map((niche) => (
                <div key={niche.niche} className="flex items-center">
                  <div className="w-full flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{niche.niche}</span>
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
      </div>
    </div>
  );
}
