import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Rocket,
  Bell,
  ArrowRight,
  ChevronLeft,
  X,
} from "lucide-react";

interface Step {
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  detail: string;
}

const STEPS: Step[] = [
  {
    icon: Rocket,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Your pipeline is ready",
    description:
      "Shadow Operator HQ is your private CRM for creator outreach and sales pipeline. Add your first lead to get started — let's take a 60-second tour.",
    detail:
      "You can revisit this tour anytime by signing out and creating a new account, or just explore on your own.",
  },
  {
    icon: LayoutDashboard,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    title: "Command Center",
    description:
      "The Dashboard gives you a live snapshot of your entire pipeline — total leads, calls booked, average priority score, and a breakdown of leads by niche.",
    detail:
      "Head here first each session to see where your outreach stands at a glance.",
  },
  {
    icon: Users,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
    title: "Leads Pipeline",
    description:
      "The Leads Pipeline is where you do your daily work. Search by creator name or handle, filter by niche, DM status, call booked status, or priority score.",
    detail:
      "Click any row to open the full lead detail page and start tracking your conversation.",
  },
  {
    icon: MessageSquare,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    title: "Track every conversation",
    description:
      "Each lead has a dedicated detail page. Update their DM status, log their response, mark a call as booked, and leave private notes — all saved instantly.",
    detail:
      "Use the Priority Score (1–10) to keep your hottest leads at the top of your attention.",
  },
  {
    icon: Bell,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    title: "Stay on top with FollowFlow",
    description:
      "FollowFlow is your automated follow-up companion. Never let a warm lead go cold — it tracks who you need to follow up with and when, so nothing slips through the cracks.",
    detail:
      "Find the FollowFlow link in the sidebar at any time. It's free to get started.",
  },
];

interface Props {
  userName: string | null;
  onDone: () => void;
}

export function OnboardingModal({ userName, onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const firstName = userName?.split(" ")[0] ?? "there";

  const Icon = current.icon;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDone(); }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Dismiss */}
        <button
          onClick={onDone}
          className="absolute right-4 top-4 rounded-sm opacity-40 hover:opacity-100 transition-opacity z-10"
          aria-label="Skip onboarding"
        >
          <X className="size-4" />
        </button>

        {/* Content */}
        <div className="px-8 pt-10 pb-8">
          {/* Step indicator */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Icon */}
          <div
            className={`size-14 rounded-2xl ${current.iconBg} flex items-center justify-center mb-6`}
          >
            <Icon className={`size-7 ${current.iconColor}`} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-3 leading-tight">
            {step === 0
              ? `Hey ${firstName}, your pipeline is ready.`
              : current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {current.description}
          </p>

          {/* Detail */}
          <p className="text-xs text-muted-foreground/70 leading-relaxed border-l-2 border-border pl-3">
            {current.detail}
          </p>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 pb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-5 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 0 ? onDone : () => setStep((s) => s - 1)}
            className="text-muted-foreground"
          >
            {step === 0 ? (
              "Skip tour"
            ) : (
              <>
                <ChevronLeft className="size-3.5 mr-1" />
                Back
              </>
            )}
          </Button>

          {isLast ? (
            <div className="flex items-center gap-2">
              <a
                href="https://snipr.is/followflow"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onDone}
              >
                <Button size="sm" variant="outline" className="gap-2 px-4">
                  <Bell className="size-3.5" />
                  Try FollowFlow
                </Button>
              </a>
              <Button size="sm" className="gap-2 px-5" onClick={onDone}>
                Get started
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-2 px-5"
              onClick={() => setStep((s) => s + 1)}
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
