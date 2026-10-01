import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, CausalityNote } from "@/components/common/states";
import { WatershedMap } from "@/components/geo/WatershedMap";
import { watershedQuery, interventionsQuery } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/watersheds/$watershedId")({
  head: () => ({ meta: [{ title: "Watershed Digital Profile — JalDrishti AI" }, { name: "description", content: "Persistent digital profile of a watershed." }] }),
  component: Profile,
});

function Profile() {
  const { watershedId } = Route.useParams();
  const ws = useQuery(watershedQuery(watershedId));
  const iv = useQuery(interventionsQuery([watershedId]));
  if (ws.isLoading) return <LoadingState />;
  if (!ws.data) return <EmptyState title="Watershed not found" />;
  const w = ws.data;
  return (
    <div>
      <PageHeader eyebrow={`${w.blocks.districts.states.name} · ${w.blocks.districts.name} · ${w.blocks.name}`} title={w.name} description={`${w.id} · Source: ${w.source}`} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Area", `${Number(w.area_ha).toLocaleString("en-IN")} ha`], ["Drainage", `${w.drainage_km ?? "—"} km`], ["Water bodies", String(w.water_bodies ?? "—")], ["Interventions", String(iv.data?.length ?? 0)]].map(([k, v]) => (
          <div key={k} className="panel p-4"><div className="eyebrow">{k}</div><div className="data-value mt-2 text-xl font-semibold">{v}</div></div>
        ))}
      </div>
      <WatershedMap className="h-[480px]" watersheds={[w]} interventions={iv.data ?? []} selectedWatershedId={w.id} />
      <CausalityNote className="mt-4" />
    </div>
  );
}
