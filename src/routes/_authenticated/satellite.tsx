import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Satellite } from "lucide-react";
import { PageHeader, StatusBadge, LoadingState, ErrorState, ConfigRequiredState, CausalityNote } from "@/components/common/states";
import { GeoFilters } from "@/components/geo/GeoFilters";
import { getSatelliteAdapters } from "@/lib/satellite.functions";

export const Route = createFileRoute("/_authenticated/satellite")({
  head: () => ({ meta: [{ title: "Satellite Analytics — JalDrishti AI" }, { name: "description", content: "NDVI, NDWI, MNDWI and land-cover analytics from authorized satellite sources." }] }),
  component: SatellitePage,
});

const INDICES = [
  { k: "NDVI", f: "(NIR − Red) / (NIR + Red)", d: "Observed vegetation-index change between selected periods." },
  { k: "NDWI", f: "(Green − NIR) / (Green + NIR)", d: "Surface water and canopy moisture indicator." },
  { k: "MNDWI", f: "(Green − SWIR1) / (Green + SWIR1)", d: "Open-water extent with reduced built-up noise." },
  { k: "LULC", f: "Classified land cover", d: "Vegetation, Agriculture, Water, Bare Land, Built-up, Other." },
];
const PIPELINE = ["Source", "Retrieval", "Validation", "Cloud filtering", "Index calculation", "Spatial aggregation", "Temporal comparison", "Insight"];

function SatellitePage() {
  const fetchAdapters = useServerFn(getSatelliteAdapters);
  const q = useQuery({ queryKey: ["sat-adapters"], queryFn: () => fetchAdapters() });
  const ready = q.data?.some((a) => a.status === "connected");
  return (
    <div>
      <PageHeader eyebrow="Analyze" title="Satellite Analytics" description="Vegetation, water and land-cover indicators computed server-side from authorized satellite sources." />
      <div className="panel mb-4 p-4"><GeoFilters /></div>
      <h2 className="mb-2 text-sm font-semibold">Data-source adapters</h2>
      {q.isLoading ? <LoadingState /> : q.isError ? <ErrorState /> : (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {q.data!.map((a) => (
            <div key={a.id} className="panel p-4">
              <div className="flex items-start justify-between gap-2"><Satellite className="h-4 w-4 text-teal" /><StatusBadge status={a.status} /></div>
              <div className="mt-2 font-semibold">{a.name}</div>
              <div className="text-xs text-muted-foreground">{a.provider} · {a.type}</div>
              <p className="mt-2 text-xs">{a.note}</p>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-2 text-sm font-semibold">Indicators</h2>
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {INDICES.map((i) => (
          <div key={i.k} className="panel p-4">
            <div className="data-value text-lg font-semibold">{i.k}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{i.f}</div>
            <p className="mt-2 text-xs">{i.d}</p>
          </div>
        ))}
      </div>
      <div className="panel mb-4 p-4">
        <div className="eyebrow mb-2">Processing pipeline</div>
        <div className="flex flex-wrap gap-2 text-xs">{PIPELINE.map((p, n) => <span key={p} className="rounded border px-2 py-1">{n + 1}. {p}</span>)}</div>
      </div>
      {!ready && <ConfigRequiredState>No satellite source is connected yet, so no index values are shown. Results appear here once Sentinel-2 credentials are configured.</ConfigRequiredState>}
      <CausalityNote className="mt-4" />
    </div>
  );
}
