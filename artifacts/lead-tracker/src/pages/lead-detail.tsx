import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetLead,
  getGetLeadQueryKey,
  useUpdateLead,
  useDeleteLead,
  getListLeadsQueryKey,
  getGetLeadStatsQueryKey,
  useGetLeadFollowups,
  getGetLeadFollowupsQueryKey,
  useCompleteFollowup,
  getListFollowupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Trash2, Loader2, Calendar, CheckCircle2, Circle, Mail, Phone, Building2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const PIPELINE_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

export default function LeadDetail() {
  const { id } = useParams();
  const leadId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useGetLead(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) },
  });

  const { data: followUps, isLoading: followUpsLoading } = useGetLeadFollowups(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadFollowupsQueryKey(leadId) },
  });

  const completeFollowup = useCompleteFollowup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadFollowupsQueryKey(leadId) });
        queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey() });
      },
    },
  });

  const updateLead = useUpdateLead({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), data);
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
        toast({ title: "Lead updated", description: "Changes saved successfully." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" });
      },
    },
  });

  const deleteLead = useDeleteLead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadStatsQueryKey() });
        toast({ title: "Lead deleted" });
        setLocation("/leads");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
      },
    },
  });

  const [formData, setFormData] = useState({
    dmStatus: "",
    response: "",
    callBooked: "",
    notes: "",
    priorityScore: 0,
    monetizationGap: "",
    status: "new" as (typeof PIPELINE_STATUSES)[number],
    company: "",
    email: "",
    phone: "",
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (lead && initializedForId.current !== leadId) {
      initializedForId.current = leadId;
      setFormData({
        dmStatus: lead.dmStatus,
        response: lead.response || "",
        callBooked: lead.callBooked,
        notes: lead.notes || "",
        priorityScore: lead.priorityScore,
        monetizationGap: lead.monetizationGap || "",
        status: lead.status,
        company: lead.company || "",
        email: lead.email || "",
        phone: lead.phone || "",
      });
    }
  }, [lead, leadId]);

  const handleUpdate = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateLead.mutate({ id: leadId, data: { [field]: value } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Interested": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      case "Replied": return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
      case "Sent": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      case "Not Interested": return "bg-red-500/15 text-red-700 dark:text-red-400";
      default: return "bg-slate-500/15 text-slate-700 dark:text-slate-400";
    }
  };

  const getPipelineColor = (status: string) => {
    switch (status) {
      case "won": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      case "lost": return "bg-slate-500/15 text-slate-700 dark:text-slate-400";
      case "proposal": return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400";
      case "qualified": return "bg-purple-500/15 text-purple-700 dark:text-purple-400";
      case "contacted": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      default: return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-1/3 mb-4" />
            <Skeleton className="h-4 w-1/4 mb-8" />
            <div className="grid grid-cols-2 gap-8">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUrl = lead.instagramHandle?.startsWith("@")
    ? lead.instagramHandle.substring(1)
    : lead.instagramHandle;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/leads"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Profile</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {lead.name}
                  {lead.instagramHandle && (
                    <a
                      href={`https://instagram.com/${handleUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </CardTitle>
                <div className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap text-sm">
                  {lead.instagramHandle && <span>{lead.instagramHandle}</span>}
                  {lead.niche && (
                    <>
                      {lead.instagramHandle && <span>•</span>}
                      <span>{lead.niche}</span>
                    </>
                  )}
                  {lead.subNiche && (
                    <>
                      <span>•</span>
                      <span>{lead.subNiche}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={`px-3 py-1 text-sm border-0 font-medium capitalize ${getPipelineColor(formData.status)}`}>
                  {formData.status}
                </Badge>
                <Badge variant="outline" className={`px-3 py-1 text-sm border-0 font-medium ${getStatusColor(formData.dmStatus)}`}>
                  {formData.dmStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Followers</div>
                  <div className="font-semibold">{lead.estFollowers ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                  <div className="font-semibold">{formData.priorityScore}/10</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Call Booked</div>
                  <div className="font-semibold">{formData.callBooked}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Added</div>
                  <div className="font-semibold text-sm flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {(lead.company || lead.email || lead.phone) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {lead.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="size-4 text-muted-foreground shrink-0" />
                      <span>{lead.company}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-4 text-muted-foreground shrink-0" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {lead.profileBioSummary && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Bio Summary</h3>
                    <p className="text-sm leading-relaxed">{lead.profileBioSummary}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monetization & Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monetization Gap</label>
                <Textarea
                  value={formData.monetizationGap}
                  onChange={(e) => setFormData((prev) => ({ ...prev, monetizationGap: e.target.value }))}
                  onBlur={(e) => handleUpdate("monetizationGap", e.target.value)}
                  className="min-h-[100px] resize-y"
                  placeholder="What is the gap in their current strategy?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Internal Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  onBlur={(e) => handleUpdate("notes", e.target.value)}
                  className="min-h-[150px] resize-y bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/50"
                  placeholder="Add any internal notes here..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Follow-Up Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {followUpsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !followUps || followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {followUps.map((f) => {
                    const isCompleted = f.status === "completed";
                    const isPastDue = !isCompleted && new Date(f.scheduledDate) < new Date();
                    return (
                      <div
                        key={f.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                          isCompleted ? "bg-muted/30 border-border/60" : isPastDue ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => !isCompleted && completeFollowup.mutate({ id: f.id })}
                            disabled={isCompleted || completeFollowup.isPending}
                            className={`shrink-0 ${isCompleted ? "text-emerald-600" : "text-muted-foreground hover:text-primary"}`}
                            title={isCompleted ? "Completed" : "Mark complete"}
                          >
                            {isCompleted ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                          </button>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">Day {f.dayOffset}</div>
                            <div className="text-xs text-muted-foreground">
                              {isCompleted && f.completedAt
                                ? `Completed ${format(new Date(f.completedAt), "MMM d, yyyy")}`
                                : format(new Date(f.scheduledDate), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        {isPastDue && (
                          <Badge variant="outline" className="border-0 bg-destructive/15 text-destructive text-xs shrink-0">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline & Outreach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pipeline Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleUpdate("status", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">DM Status</label>
                <Select
                  value={formData.dmStatus}
                  onValueChange={(val) => handleUpdate("dmStatus", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Sent">Not Sent</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Replied">Replied</SelectItem>
                    <SelectItem value="Interested">Interested</SelectItem>
                    <SelectItem value="Not Interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Call Booked</label>
                <Select
                  value={formData.callBooked}
                  onValueChange={(val) => handleUpdate("callBooked", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority Score (1-10)</label>
                <Select
                  value={formData.priorityScore.toString()}
                  onValueChange={(val) => handleUpdate("priorityScore", Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Response</label>
                <Textarea
                  value={formData.response}
                  onChange={(e) => setFormData((prev) => ({ ...prev, response: e.target.value }))}
                  onBlur={(e) => handleUpdate("response", e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Paste their response here..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                  onBlur={(e) => handleUpdate("company", e.target.value || null)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  onBlur={(e) => handleUpdate("email", e.target.value || null)}
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  onBlur={(e) => handleUpdate("phone", e.target.value || null)}
                  placeholder="555-0100"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="size-4 mr-2" />
                    Delete Lead
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the lead "{lead.name}" and remove their data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteLead.mutate({ id: leadId })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteLead.isPending ? "Deleting..." : "Delete Lead"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
