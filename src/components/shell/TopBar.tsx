import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, HelpCircle, Search, MapPin, Construction, Map as MapIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCurrentUser, useSignOut, ROLE_LABELS } from "@/lib/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function TopBar({ leading }: { leading?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const signOut = useSignOut();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
      {leading}
      <button onClick={() => setOpen(true)} className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground hover:border-ring">
        <Search className="h-4 w-4" />
        <span className="truncate">Search watershed, intervention, village, coordinates…</span>
        <kbd className="ml-auto hidden rounded border px-1.5 font-mono text-[10px] sm:block">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <span className="mr-2 hidden rounded border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-teal md:inline">SIH26015 Prototype</span>
        <Link to="/notifications" className="rounded-md p-2 hover:bg-muted" aria-label="Notifications"><Bell className="h-4 w-4" /></Link>
        <Link to="/settings" className="rounded-md p-2 hover:bg-muted" aria-label="Help"><HelpCircle className="h-4 w-4" /></Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
            {(me?.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="font-semibold">{me?.profile?.full_name}</div>
              <div className="text-xs font-normal text-muted-foreground">{me && ROLE_LABELS[me.primaryRole]}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Profile & settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/audit" })}>My activity</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </header>
  );
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const term = q.trim();
  const coord = term.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);

  const { data } = useQuery({
    queryKey: ["global-search", term],
    enabled: term.length >= 2 && !coord,
    queryFn: async () => {
      const safe = term.replace(/[%,()]/g, "");
      const [ws, iv] = await Promise.all([
        supabase.from("watersheds").select("id,name,block_id").or(`id.ilike.%${safe}%,name.ilike.%${safe}%`).limit(8),
        supabase.from("interventions").select("id,village,watershed_id,type").or(`id.ilike.%${safe}%,village.ilike.%${safe}%`).limit(8),
      ]);
      return { watersheds: ws.data ?? [], interventions: iv.data ?? [] };
    },
  });

  const go = (fn: () => void) => {
    onOpenChange(false);
    setQ("");
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Watershed ID, intervention ID, village, district or lat,lng" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{term.length < 2 ? "Type at least 2 characters." : "No matching records."}</CommandEmpty>
        {coord && (
          <CommandGroup heading="Coordinates">
            <CommandItem value={term} onSelect={() => go(() => navigate({ to: "/watersheds", search: { lat: Number(coord[1]), lng: Number(coord[2]) } }))}>
              <MapPin className="h-4 w-4" /> Open {coord[1]}, {coord[2]} on map
            </CommandItem>
          </CommandGroup>
        )}
        {!!data?.watersheds.length && (
          <CommandGroup heading="Watersheds">
            {data.watersheds.map((w) => (
              <CommandItem key={w.id} value={w.id + w.name} onSelect={() => go(() => navigate({ to: "/watersheds/$watershedId", params: { watershedId: w.id } }))}>
                <MapIcon className="h-4 w-4" /> <span className="font-mono text-xs">{w.id}</span> {w.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!data?.interventions.length && (
          <CommandGroup heading="Interventions">
            {data.interventions.map((i) => (
              <CommandItem key={i.id} value={i.id + i.village} onSelect={() => go(() => navigate({ to: "/watersheds/$watershedId", params: { watershedId: i.watershed_id } }))}>
                <Construction className="h-4 w-4" /> <span className="font-mono text-xs">{i.id}</span> {i.village}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {term.length >= 2 && (
          <CommandGroup heading="Images & Reports">
            <CommandItem disabled value="images-reports-empty">No field images or reports have been recorded yet.</CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
