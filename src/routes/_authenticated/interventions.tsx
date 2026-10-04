import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, StatusBadge, CausalityNote } from "@/components/common/states";
import { GeoFilters } from "@/components/geo/GeoFilters";
import { useGeoScope } from "@/lib/geo-scope";
import { useCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  watershedsQuery, interventionsQuery, watershedQuery,
  INTERVENTION_LABELS, STATUS_LABELS, type Intervention, type InterventionType, type MonitoringStatus,
} from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/interventions")({
  head: () => ({ meta: [{ title: "Intervention Intelligence — JalDrishti AI" }, { name: "description", content: "Complete spatial and temporal record for every watershed intervention." }] }),
  component: InterventionsPage,
});

type FieldImage = {
  id: string;
  object_key: string;
  captured_at: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  observation: string | null;
};

const STATUS_TONE: Record<MonitoringStatus, "live" | "requires_configuration" | "processing" | "archived" | "unavailable"> = {
  monitored: "live",
  analysis_available: "processing",
  pending_validation: "requires_configuration",
  requires_review: "requires_configuration",
  data_incomplete: "archived",
};

function StatusPill({ status }: { status: MonitoringStatus }) {
  return <StatusBadge status={STATUS_TONE[status]} label={STATUS_LABELS[status]} />;
}

function EvidenceTimeline({ interventionId }: { interventionId: string }) {
  const images = useQuery({
    queryKey: ["field-images", "intervention", interventionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_images")
        .select("id, object_key, captured_at, created_at, lat, lng, observation")
        .eq("intervention_id", interventionId)
        .order("captured_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as FieldImage[];
    },
  });

  const signed = useQuery({
    queryKey: ["field-images-signed", interventionId],
    enabled: (images.data?.length ?? 0) > 0,
    queryFn: async () => {
      const keys = (images.data ?? []).map((i) => i.object_key);
      const { data, error } = await supabase.storage.from("field-images").createSignedUrls(keys, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      (images.data ?? []).forEach((img, idx) => {
        const url = data[idx]?.signedUrl;
        if (url) map[img.id] = url;
      });
      return map;
    },
  });

  if (images.isLoading) return <p className="text-sm text-muted-foreground">Loading evidence timeline…</p>;
  const list = images.data ?? [];
  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No field photographs are linked to this intervention yet. Capture geo-coded evidence in Geo-Image Intelligence to build the longitudinal record.
      </p>
    );
  }
  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {list.map((img) => (
        <li key={img.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="flex gap-3">
            {signed.data?.[img.id] ? (
              <img src={signed.data[img.id]} alt="Field evidence" className="h-16 w-16 rounded object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded bg-muted"><Camera className="h-5 w-5 text-muted-foreground" /></div>
            )}
            <div className="min-w-0 text-xs">
              <p className="font-mono font-medium">{img.captured_at ? new Date(img.captured_at).toISOString().slice(0, 10) : "Capture date unavailable"}</p>
              <p className="text-muted-foreground">{img.lat != null && img.lng != null ? `${img.lat.toFixed(5)}, ${img.lng.toFixed(5)}` : "GPS metadata unavailable"}</p>
              {img.observation && <p className="mt-1 line-clamp-2">{img.observation}</p>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InterventionsPage() {
  const scope = useGeoScope();
  const { can } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<InterventionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MonitoringStatus | "all">("all");

  const watersheds = useQuery(watershedsQuery({ stateId: scope.stateId, districtId: scope.districtId, blockId: scope.blockId }));
  const wsIds = useMemo(() => (scope.watershedId ? [scope.watershedId] : (watersheds.data ?? []).map((w) => w.id)), [scope.watershedId, watersheds.data]);
  const interventions = useQuery(interventionsQuery(wsIds));

  const filtered = useMemo(
    () =>
      (interventions.data ?? []).filter(
        (i) => (typeFilter === "all" || i.type === typeFilter) && (statusFilter === "all" || i.status === statusFilter),
      ),
    [interventions.data, typeFilter, statusFilter],
  );

  const selected = filtered.find((i) => i.id === selectedId) ?? null;
  const ws = useQuery({ ...watershedQuery(selected?.watershed_id ?? ""), enabled: !!selected });
  const canReview = can("interventions:review");

  const setStatus = async (id: string, status: MonitoringStatus) => {
    const { error } = await supabase.from("interventions").update({ status }).eq("id", id);
    if (error) {
      toast.error("The monitoring status could not be updated. Please retry or contact an administrator.");
      return;
    }
    await logAudit({ action: "intervention_status_update", entity: "interventions", entity_id: id, detail: { status } });
    toast.success(`Status updated to ${STATUS_LABELS[status]}.`);
    void queryClient.invalidateQueries({ queryKey: ["interventions"] });
  };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Record · Evidence · Review" title="Intervention Intelligence" description="The complete record for every intervention: location, implementation, field evidence timeline and monitoring status." />
      <GeoFilters />

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as InterventionType | "all")}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(INTERVENTION_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MonitoringStatus | "all")}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto self-center font-mono text-xs text-muted-foreground">{filtered.length} intervention{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {interventions.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading interventions…</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="No interventions in this scope">Adjust the geographic filters or clear the type and status filters.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="panel max-h-[70vh] overflow-y-auto lg:col-span-2">
            <ul className="divide-y divide-border">
              {filtered.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(i.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/60 ${selectedId === i.id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{INTERVENTION_LABELS[i.type]}</span>
                      <StatusPill status={i.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{i.village} · implemented {i.implemented_on}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{i.id.slice(0, 8)} · {i.evidence_count} photo{i.evidence_count === 1 ? "" : "s"}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 lg:col-span-3">
            {!selected ? (
              <EmptyState title="Select an intervention">Choose an intervention from the list to open its full intelligence record.</EmptyState>
            ) : (
              <>
                <div className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{INTERVENTION_LABELS[selected.type]}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selected.village}
                        {ws.data ? ` · ${ws.data.blocks.name}, ${ws.data.blocks.districts.name}, ${ws.data.blocks.districts.states.name}` : ""}
                      </p>
                    </div>
                    <StatusPill status={selected.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-muted-foreground">Intervention ID</dt><dd className="font-mono text-xs">{selected.id}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Coordinates</dt><dd className="font-mono text-xs">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Implemented on</dt><dd>{selected.implemented_on}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Watershed</dt><dd>{ws.data?.name ?? "…"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Evidence items</dt><dd>{selected.evidence_count}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Data origin</dt><dd className="capitalize">{selected.data_origin.replace(/_/g, " ")}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/watersheds" search={{ lat: selected.lat, lng: selected.lng }}>
                        <MapPin className="mr-1.5 h-3.5 w-3.5" /> View on map
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/change-detection">Compare before vs after</Link>
                    </Button>
                  </div>
                  {canReview && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <span className="text-xs font-medium text-muted-foreground">Set monitoring status:</span>
                      {(Object.keys(STATUS_LABELS) as MonitoringStatus[]).map((s) => (
                        <Button key={s} variant={s === selected.status ? "default" : "outline"} size="sm" disabled={s === selected.status} onClick={() => void setStatus(selected.id, s)}>
                          {STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel p-4">
                  <h3 className="mb-3 text-sm font-semibold">Evidence Timeline</h3>
                  <EvidenceTimeline interventionId={selected.id} />
                </div>

                <CausalityNote />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
