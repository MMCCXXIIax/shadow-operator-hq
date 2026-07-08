import React, { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  Search,
  BarChart3,
  ShieldCheck,
  Instagram,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type Mode = "signin" | "signup";

const FEATURES = [
  {
    icon: Instagram,
    title: "38 Curated Creator Leads",
    description:
      "Pre-loaded with vetted Instagram creators across 15 niches — fitness, beauty, finance, gaming, and more.",
  },
  {
    icon: BarChart3,
    title: "Full Outreach Pipeline",
    description:
      "Track every lead from cold to closed. DM status, responses, calls booked, and priority scores — all in one view.",
  },
  {
    icon: Search,
    title: "Instant Filter & Search",
    description:
      "Find any lead in seconds. Filter by niche, DM status, priority score, or call booked status.",
  },
  {
    icon: ShieldCheck,
    title: "Your Data, Private",
    description:
      "Account-isolated by design. Only you can see your leads — no shared access, no leaks.",
  },
];

const STATS = [
  { value: "38+", label: "Creator leads" },
  { value: "15", label: "Niches" },
  { value: "1–10", label: "Priority scoring" },
  { value: "100%", label: "Your data only" },
];

export default function Landing({
  onSignupSuccess,
}: {
  onSignupSuccess?: () => void;
}) {
  const { refetch } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint =
      mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const body =
      mode === "signup"
        ? { fullName: fullName.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (mode === "signup") {
        onSignupSuccess?.();
      }

      refetch();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setFullName("");
    setPassword("");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* ── Left: Marketing panel ─────────────────────────────────── */}
      <div className="lg:w-3/5 bg-gradient-to-br from-primary/8 via-background to-primary/4 border-r border-border flex flex-col">
        {/* Header */}
        <div className="px-10 pt-10 flex items-center gap-2.5 font-bold text-xl text-primary tracking-tight">
          <div className="size-8 bg-primary rounded-md flex items-center justify-center shadow-sm">
            <div className="size-3 bg-background rounded-full" />
          </div>
          AI Shadow
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6 w-fit border border-primary/20">
            <CheckCircle2 className="size-3.5" />
            Built for AI Shadow operators
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5 text-foreground">
            Close more deals.
            <br />
            <span className="text-primary">Track every lead.</span>
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            The CRM purpose-built for AI Shadow. Manage your Instagram creator
            outreach, monitor your pipeline health, and never lose track of a
            warm lead again.
          </p>

          {/* Feature list */}
          <ul className="space-y-5 mb-12">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-primary/15">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">
                    {title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-4 pt-8 border-t border-border/60">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-10 pb-8">
          <p className="text-xs text-muted-foreground/60">
            Your data is private and isolated to your account.
          </p>
        </div>
      </div>

      {/* ── Right: Auth panel ─────────────────────────────────────── */}
      <div className="lg:w-2/5 flex flex-col justify-center px-8 py-12 lg:px-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 font-bold text-xl text-primary tracking-tight mb-10 lg:hidden">
          <div className="size-8 bg-primary rounded-md flex items-center justify-center shadow-sm">
            <div className="size-3 bg-background rounded-full" />
          </div>
          AI Shadow
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* Mode header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1.5">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to access your lead pipeline."
                : "Set up your operator account to get started."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  disabled={loading}
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "signup" ? "At least 8 characters" : "Your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."}
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Sign in"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Mode switch */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => switchMode("signin")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Trust note */}
          <div className="mt-10 pt-8 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Your account is private. No data is shared between users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
