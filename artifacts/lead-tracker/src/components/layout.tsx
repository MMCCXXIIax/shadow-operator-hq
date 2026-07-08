import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, LayoutDashboard, Plus, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const displayName = user.fullName || user.email || "Operator";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 w-full rounded-lg px-2 py-2 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors text-sm" data-testid="user-menu-trigger">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left truncate font-medium">{displayName}</span>
          <ChevronDown className="size-3.5 opacity-50 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium truncate">{displayName}</p>
          {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer" data-testid="logout-button">
          <LogOut className="mr-2 size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <div className="size-6 bg-primary rounded-sm flex items-center justify-center">
                <div className="size-2 bg-background rounded-full" />
              </div>
              Shadow Operator HQ
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/">
                    <LayoutDashboard className="size-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/leads" || location.startsWith("/leads/")}>
                  <Link href="/leads">
                    <Users className="size-4" />
                    <span>Leads Pipeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
            <UserMenu />
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center px-6 bg-card sticky top-0 z-10 shrink-0">
            <SidebarTrigger className="-ml-2 mr-4" />
            <div className="flex-1" />
            <Link href="/leads/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
              <Plus className="mr-2 size-4" />
              New Lead
            </Link>
          </header>
          <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
