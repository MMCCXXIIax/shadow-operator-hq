import { useState } from "react";
import {
  useListLeadEvidence,
  getListLeadEvidenceQueryKey,
  useCreateLeadEvidence,
  useUpdateEvidenceItem,
  useDeleteEvidenceItem,
  type EvidenceItem,
  type EvidenceType,
  type EvidenceVerificationStatus,
  type EvidenceRetrievalMethod,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, FileSearch, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  public_bio: "Public bio",
  public_post: "Public post",
  visible_metric: "Visible metric",
  audience_question: "Audience question",
  creator_provided: "Creator-provided",
  other: "Other",
};

const VERIFICATION_LABELS: Record<EvidenceVerificationStatus, string> = {
  unverified: "Observed — not verified",
  creator_stated: "Creator stated",
  verified: "Verified",
  disputed: "Disputed",
};

const VERIFICATION_STYLES: Record<EvidenceVerificationStatus, string> = {
  unverified: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  creator_stated: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  verified: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  disputed: "bg-destructive/15 text-destructive",
};

const RETRIEVAL_LABELS: Record<EvidenceRetrievalMethod, string> = {
  manual_entry: "Manual entry",
  screenshot: "Screenshot",
  creator_message: "Creator message",
  api: "API retrieval",
  other: "Other",
};

type FormState = {
  evidenceType: EvidenceType;
  verificationStatus: EvidenceVerificationStatus;
  retrievalMethod: EvidenceRetrievalMethod;
  capturedAt: string;
  sourceUrl: string;
  sourceDescription: string;
  content: string;
  notes: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: FormState = {
  evidenceType: "public_bio",
  verificationStatus: "unverified",
  retrievalMethod: "manual_entry",
  capturedAt: todayInputValue(),
  sourceUrl: "",
  sourceDescription: "",
  content: "",
  notes: "",
};

function toFormState(item: EvidenceItem): FormState {
  return {
    evidenceType: item.evidenceType,
    verificationStatus: item.verificationStatus,
    retrievalMethod: item.retrievalMethod,
    capturedAt: new Date(item.capturedAt).toISOString().slice(0, 10),
    sourceUrl: item.sourceUrl ?? "",
    sourceDescription: item.sourceDescription ?? "",
    content: item.content,
    notes: item.notes ?? "",
  };
}

export function EvidenceSection({ leadId, leadName }: { leadId: number; leadName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading, isError, refetch } = useListLeadEvidence(leadId, {
    query: { enabled: !!leadId, queryKey: getListLeadEvidenceQueryKey(leadId) },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EvidenceItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EvidenceItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListLeadEvidenceQueryKey(leadId) });

  const createEvidence = useCreateLeadEvidence({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDialogOpen(false);
        toast({ title: "Evidence recorded", description: "Saved against this creator." });
      },
      onError: () => toast({ title: "Error", description: "Failed to save evidence.", variant: "destructive" }),
    },
  });

  const updateEvidence = useUpdateEvidenceItem({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDialogOpen(false);
        toast({ title: "Evidence updated" });
      },
      onError: () => toast({ title: "Error", description: "Failed to update evidence.", variant: "destructive" }),
    },
  });

  const deleteEvidence = useDeleteEvidenceItem({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Evidence deleted" });
      },
      onError: () => toast({ title: "Error", description: "Failed to delete evidence.", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(item: EvidenceItem) {
    setEditing(item);
    setForm(toFormState(item));
    setError("");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) {
      setError("Describe what you observed — the evidence content is required.");
      return;
    }
    setError("");

    const payload = {
      evidenceType: form.evidenceType,
      verificationStatus: form.verificationStatus,
      retrievalMethod: form.retrievalMethod,
      capturedAt: new Date(`${form.capturedAt}T12:00:00Z`).toISOString(),
      sourceUrl: form.sourceUrl.trim() || null,
      sourceDescription: form.sourceDescription.trim() || null,
      content: form.content.trim(),
      notes: form.notes.trim() || null,
    };

    if (editing) {
      updateEvidence.mutate({ id: editing.id, data: payload });
    } else {
      createEvidence.mutate({ id: leadId, data: payload });
    }
  }

  const isSaving = createEvidence.isPending || updateEvidence.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Evidence</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            What you can point to about {leadName}. Mark each item honestly — observed is not the same as verified.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="shrink-0">
          <Plus className="size-4 mr-1.5" />
          Add evidence
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">Could not load evidence for this creator.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileSearch className="size-5 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No evidence recorded yet. Add a public bio, post, metric, or something the creator told you.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-0 bg-muted text-foreground">
                    {EVIDENCE_TYPE_LABELS[item.evidenceType]}
                  </Badge>
                  <Badge variant="outline" className={`border-0 ${VERIFICATION_STYLES[item.verificationStatus]}`}>
                    {VERIFICATION_LABELS[item.verificationStatus]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.capturedAt), "MMM d, yyyy")} · {RETRIEVAL_LABELS[item.retrievalMethod]}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(item)} title="Edit evidence">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(item)}
                      disabled={deleteEvidence.isPending}
                      title="Delete evidence"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>

                {(item.sourceUrl || item.sourceDescription) && (
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary inline-flex items-center gap-1 break-all"
                      >
                        <ExternalLink className="size-3 shrink-0" />
                        {item.sourceDescription || item.sourceUrl}
                      </a>
                    ) : (
                      <span>Source: {item.sourceDescription}</span>
                    )}
                  </div>
                )}

                {item.notes && (
                  <p className="text-xs text-muted-foreground border-l-2 pl-2">{item.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit evidence" : "Add evidence"}</DialogTitle>
            <DialogDescription>
              Record what you actually saw, and say how you know it. Nothing here is presented as verified unless you mark it so.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Evidence type</Label>
                <Select
                  value={form.evidenceType}
                  onValueChange={(val) => setForm((f) => ({ ...f, evidenceType: val as EvidenceType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceType[]).map((t) => (
                      <SelectItem key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Captured on</Label>
                <Input
                  type="date"
                  value={form.capturedAt}
                  onChange={(e) => setForm((f) => ({ ...f, capturedAt: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Provenance</Label>
                <Select
                  value={form.verificationStatus}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, verificationStatus: val as EvidenceVerificationStatus }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VERIFICATION_LABELS) as EvidenceVerificationStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{VERIFICATION_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>How you captured it</Label>
                <Select
                  value={form.retrievalMethod}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, retrievalMethod: val as EvidenceRetrievalMethod }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RETRIEVAL_LABELS) as EvidenceRetrievalMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>{RETRIEVAL_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Evidence content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Paste the exact text or describe exactly what was visible…"
                className="min-h-[100px] resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source URL</Label>
                <Input
                  value={form.sourceUrl}
                  onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                  placeholder="https://instagram.com/p/…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source description</Label>
                <Input
                  value={form.sourceDescription}
                  onChange={(e) => setForm((f) => ({ ...f, sourceDescription: e.target.value }))}
                  placeholder="Bio as shown on profile"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Why this matters, caveats…"
                className="min-h-[70px] resize-y"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                {editing ? "Save changes" : "Record evidence"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              {`It will be removed from ${leadName}'s record permanently. What you observed cannot be recovered if you change your mind.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (pendingDelete) {
                  deleteEvidence.mutate({ id: pendingDelete.id });
                }
                setPendingDelete(null);
              }}
            >
              Delete evidence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
