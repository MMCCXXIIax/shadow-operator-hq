import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import LeadDetail from "@/pages/lead-detail";
import NewLead from "@/pages/new-lead";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import { OnboardingModal } from "@/components/onboarding";
import { useAuth, AuthProvider } from "@workspace/replit-auth-web";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient();

function onboardingKey(userId: string) {
  return `onboarding_complete_${userId}`;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [pendingOnboarding, setPendingOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const done = localStorage.getItem(onboardingKey(user.id));
    if (!done || pendingOnboarding) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, user]);

  function handleSignupSuccess() {
    setPendingOnboarding(true);
  }

  function handleOnboardingDone() {
    setShowOnboarding(false);
    if (user) {
      localStorage.setItem(onboardingKey(user.id), "done");
    }
    setPendingOnboarding(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing onSignupSuccess={handleSignupSuccess} />;
  }

  return (
    <>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/leads" component={Leads} />
          <Route path="/leads/new" component={NewLead} />
          <Route path="/leads/:id" component={LeadDetail} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
      {showOnboarding && (
        <OnboardingModal
          userName={user?.fullName ?? null}
          onDone={handleOnboardingDone}
        />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
