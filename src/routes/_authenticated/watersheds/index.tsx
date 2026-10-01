import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PageHeader } from "@/components/common/states";
import { GeoFilters } from "@/components/geo/GeoFilters";
import { WatershedMap } from "@/components/geo/WatershedMap";
import { setGeoScope, useGeoScope } from "@/lib/geo-scope";
import { watershedsQuery, interventionsQuery } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/watersheds/")({
  validateSearch: z.object({ lat: z.number().optional(), lng: z.number().optional() }),
  head: () => ({ meta: [{ title: "Watershed Explorer — JalDrishti AI" }, { name: "description", content: "Explore watersheds across states, districts and blocks." }] }),
  component: Explorer,
});

function Explorer() {
  const { lat, lng } = Route.useSearch();
  const scope = useGeoScope();
  const ws = useQuery(watershedsQuery(scope));
  const list = ws.data ?? [];
  const iv = useQuery(interventionsQuery(list.map((w) => w.id)));
  return (
    <div>
      <PageHeader eyebrow="Explorer" title="Watershed Explorer" />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="panel space-y-4 p-4">
          <GeoFilters layout="stack" showPeriod={false} />
          <ul className="max-h-[400px] space-y-1 overflow-y-auto text-sm">
            {list.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted">
                <button className="truncate text-left" onClick={() => setGeoScope({ watershedId: w.id })}>{w.name}</button>
                <Link to="/watersheds/$watershedId" params={{ watershedId: w.id }} className="text-xs text-teal">Profile</Link>
              </li>
            ))}
          </ul>
        </div>
        <WatershedMap className="h-[620px]" watersheds={list} interventions={iv.data ?? []} selectedWatershedId={scope.watershedId} onSelectWatershed={(id) => setGeoScope({ watershedId: id })} focusPoint={lat != null && lng != null ? { lat, lng } : undefined} />
      </div>
    </div>
  );
}
