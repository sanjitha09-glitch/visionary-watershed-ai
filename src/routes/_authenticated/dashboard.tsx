import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatusBadge, CausalityNote } from "@/components/common/states";
import { GeoFilters } from "@/components/geo/GeoFilters";
import { WatershedMap } from "@/components/geo/WatershedMap";
import { useGeoScope } from "@/lib/geo-scope";
import { watershedsQuery, interventionsQuery } from "@/lib/geo";
import { useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JalDrishti AI" }, { name: "description", content: "Watershed intelligence command-center dashboard." }] }),
  component: Dashboard,
});

function Dashboard() {
  const scope = useGeoScope();
  const { data: me } = useCurrentUser();
  const ws = useQuery(watershedsQuery(scope));
  const list = (ws.data ?? []).filter((w) => !scope.watershedId || w.id === scope.watershedId);
  const iv = useQuery(interventionsQuery(list.map((w) => w.id)));
  const area = list.reduce((a, w) => a + Number(w.area_ha), 0);
  const kpis = [
    { label: "Watershed Area", value: area.toLocaleString("en-IN"), unit: "ha" },
    { label: "Watersheds", value: String(list.length), unit: "" },
    { label: "Interventions Monitored", value: String(iv.data?.length ?? 0), unit: "" },
    { label: "Geo-coded Field Images", value: "0", unit: "" },
  ];
  return (
    <div>
      <PageHeader eyebrow={`Welcome back${me?.profile?.full_name ? ", " + me.profile.full_name : ""}`} title="Watershed Intelligence Dashboard" description={`Last updated ${new Date().toLocaleString("en-IN")}`} />
      <div className="panel mb-4 p-4"><GeoFilters /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-4">
            <div className="eyebrow">{k.label}</div>
            <div className="data-value mt-2 text-2xl font-semibold">{k.value} <span className="text-sm text-muted-foreground">{k.unit}</span></div>
            <StatusBadge status="archived" className="mt-2" />
          </div>
        ))}
      </div>
      <WatershedMap className="h-[560px]" watersheds={list} interventions={iv.data ?? []} selectedWatershedId={scope.watershedId} />
      <CausalityNote className="mt-4" />
    </div>
  );
}
