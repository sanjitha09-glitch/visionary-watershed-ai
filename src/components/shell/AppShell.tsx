import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronsLeft, ChevronsRight, LogOut, Activity, Database, Menu } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { NAV_ITEMS } from "./nav";
import { useCurrentUser, useSignOut, ROLE_LABELS } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { TopBar } from "./TopBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] lg:block", collapsed ? "w-[68px]" : "w-64")}>
        <SidebarBody collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar leading={<button className="rounded p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useCurrentUser();
  const signOut = useSignOut();
  const [confirm, setConfirm] = useState(false);
  const isAdmin = me?.can("integrations:manage");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {collapsed ? <LogoMark className="text-sidebar-primary" /> : <Logo inverted />}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]" : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border px-2 py-3 text-[12px]">
        {!collapsed && (
          <>
            <Link to="/data-sources" className="flex items-center gap-2.5 rounded px-3 py-1.5 hover:bg-sidebar-accent/60">
              <Activity className="h-3.5 w-3.5 text-sidebar-primary" /> System Status <span className="ml-auto font-mono text-[10px] text-sidebar-primary">Operational</span>
            </Link>
            <Link to="/data-sources" className="flex items-center gap-2.5 rounded px-3 py-1.5 hover:bg-sidebar-accent/60">
              <Database className="h-3.5 w-3.5 text-warning" /> Data Sources <span className="ml-auto font-mono text-[10px] text-warning">Setup needed</span>
            </Link>
          </>
        )}
        <Link to="/settings" onClick={onNavigate} className="mt-1 flex items-center gap-2.5 rounded px-2 py-2 hover:bg-sidebar-accent/60">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[12px] font-bold text-sidebar-primary-foreground">
            {(me?.profile?.full_name ?? me?.user.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-sidebar-accent-foreground">{me?.profile?.full_name ?? "—"}</div>
              <div className="truncate font-mono text-[10px] opacity-70">{me ? ROLE_LABELS[me.primaryRole] : ""}</div>
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setConfirm(true)} className="flex flex-1 items-center gap-2.5 rounded px-3 py-2 hover:bg-sidebar-accent/60" title="Logout">
            <LogOut className="h-4 w-4" /> {!collapsed && "Logout"}
          </button>
          {onToggle && (
            <button onClick={onToggle} className="rounded p-2 hover:bg-sidebar-accent/60" aria-label="Toggle sidebar">
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of JalDrishti AI?</AlertDialogTitle>
            <AlertDialogDescription>Your session will be ended on this device and cached data will be cleared.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
