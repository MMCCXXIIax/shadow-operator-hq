import { format, differenceInDays } from "date-fns";
import { useCompleteFollowup, getListFollowupsQueryKey, getListLeadsQueryKey, type FollowUp } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Instagram, CalendarClock, Loader2, AlertCircle, Circle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

interface FollowUpCardProps {
  followUp: FollowUp;
  variant: "overdue" | "today" | "upcoming";
}

export function FollowUpCard({ followUp, variant }: FollowUpCardProps) {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const completeMutation = useCompleteFollowup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      },
    },
  });

  const isOverdue = variant === "overdue";
  const isToday = variant === "today";

  const daysOverdue = isOverdue
    ? differenceInDays(new Date(), new Date(followUp.scheduledDate))
    : 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-3.5 rounded-lg border transition-all duration-200 group flex items-start gap-3
        ${isOverdue
          ? "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
          : isToday
            ? "bg-card border-primary/20 shadow-sm hover:border-primary/40 hover:shadow-md"
            : "bg-background border-border hover:border-border/80"
        }
      `}
    >
      <button
        onClick={() => completeMutation.mutate({ id: followUp.id })}
        disabled={completeMutation.isPending}
        className={`
          mt-0.5 shrink-0 transition-all duration-200 disabled:opacity-50 flex items-center justify-center rounded-full
          ${completeMutation.isPending ? "text-muted-foreground" : ""}
          ${isOverdue && !completeMutation.isPending ? "text-destructive hover:bg-destructive/10 hover:scale-110" : ""}
          ${isToday && !completeMutation.isPending ? "text-primary hover:bg-primary/10 hover:scale-110" : ""}
          ${!isOverdue && !isToday && !completeMutation.isPending ? "text-muted-foreground hover:text-primary hover:scale-110" : ""}
        `}
      >
        {completeMutation.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isHovered ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5 opacity-70" />
        )}
      </button>

      <Link href={`/leads/${followUp.leadId}`} className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h3 className="font-bold text-sm truncate text-foreground">
            {followUp.leadName || "Unknown Lead"}
          </h3>
          <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-background border border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Day {followUp.dayOffset}
          </span>
        </div>

        {followUp.leadInstagramHandle && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1.5">
            <Instagram className="w-3 h-3" />
            <span className="truncate">{followUp.leadInstagramHandle}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          {isOverdue ? (
            <>
              <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
              <span className="text-destructive">
                {daysOverdue === 0 ? "Due today" : `${daysOverdue}d overdue`}
              </span>
            </>
          ) : (
            <>
              <CalendarClock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {format(new Date(followUp.scheduledDate), "MMM d, yyyy")}
              </span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
