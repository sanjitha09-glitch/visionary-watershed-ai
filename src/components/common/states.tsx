import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Lock, Loader2, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataStatus = "live" | "connected" | "processing" | "unavailable" | "requires_configuration" | "archived" | "authentication_required";

const STATUS_STYLE: Record<DataStatus, { label: string; cls: string }> = {
  live: { label: "Live", cls: "border-vegetation/30 bg-vegetation/10 text-vegetation" },
  connected: { label: "Connected", cls: "border-vegetation/30 bg-vegetation/10 text-vegetation" },
  processing: { label: "Processing", cls: "border-water/30 bg-water/10 text-water" },
  unavailable: { label: "Unavailable", cls: "border-critical/30 bg-critical/10 text-critical" },
  requires_configuration: { label: "Requires Configuration", cls: "border-warning/40 bg-warning/15 text-foreground" },
  authentication_required: { label: "Authentication Required", cls: "border-warning/40 bg-warning/15 text-foreground" },
  archived: { label: "Reference Dataset", cls: "border-border bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, label, className }: { status: DataStatus; label?: string; className?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider", s.cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? s.label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-bold md:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function Shell({ icon, title, children, tone = "muted" }: { icon: ReactNode; title: string; children?: ReactNode; tone?: "muted" | "error" | "warn" }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center", tone === "error" && "border-critical/40 bg-critical/5", tone === "warn" && "border-warning/50 bg-warning/5")}>
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <div className="text-sm font-semibold">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export const LoadingState = ({ label = "Loading…" }: { label?: string }) => <Shell icon={<Loader2 className="h-5 w-5 animate-spin" />} title={label} />;
export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => <Shell icon={<Inbox className="h-5 w-5" />} title={title}>{children}</Shell>;
export const ErrorState = ({ title = "This information could not be loaded", children }: { title?: string; children?: ReactNode }) => (
  <Shell tone="error" icon={<AlertTriangle className="h-5 w-5 text-critical" />} title={title}>{children ?? "Please retry. If the problem continues, contact an administrator."}</Shell>
);
export const NoPermissionState = ({ children }: { children?: ReactNode }) => (
  <Shell icon={<Lock className="h-5 w-5" />} title="You do not have access to this area">{children ?? "Ask an administrator to assign the appropriate role."}</Shell>
);
export const ConfigRequiredState = ({ title = "Integration requires configuration", children }: { title?: string; children?: ReactNode }) => (
  <Shell tone="warn" icon={<PlugZap className="h-5 w-5 text-warning" />} title={title}>{children}</Shell>
);

export function CausalityNote({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-md border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs leading-relaxed", className)}>
      <strong>Interpretation note.</strong> Indicators describe observed spatial change only. Changes may reflect rainfall, seasonality, land-use change, nearby interventions or data quality, and require contextual validation before any attribution to an intervention.
    </p>
  );
}
