import { cn } from "@/lib/utils";

/** JalDrishti mark: a water drop drawn as contour rings with an observing iris. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden="true">
      <path d="M20 3 C 27 12, 33 19, 33 25.5 A 13 13 0 0 1 7 25.5 C 7 19, 13 12, 20 3 Z" fill="currentColor" opacity="0.12" />
      <path d="M20 3 C 27 12, 33 19, 33 25.5 A 13 13 0 0 1 7 25.5 C 7 19, 13 12, 20 3 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11.5 25 C 14.5 21.5, 25.5 21.5, 28.5 25 C 25.5 28.5, 14.5 28.5, 11.5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="20" cy="25" r="2.6" fill="currentColor" />
      <path d="M14 17 C 17 15.6, 23 15.6, 26 17" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
      <path d="M16.5 12.6 C 18.5 11.8, 21.5 11.8, 23.5 12.6" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={inverted ? "text-sidebar-primary" : "text-primary"} />
      <div className="leading-none">
        <div className="text-[17px] font-extrabold tracking-tight">
          JalDrishti <span className={inverted ? "text-sidebar-primary" : "text-teal"}>AI</span>
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">Watershed Intelligence</div>
      </div>
    </div>
  );
}
