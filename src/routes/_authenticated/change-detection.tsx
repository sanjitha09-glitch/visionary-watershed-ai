import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Camera, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, CausalityNote, ConfigRequiredState, EmptyState, StatusBadge } from "@/components/common/states";
import { GeoFilters } from "@/components/geo/GeoFilters";
import { useGeoScope } from "@/lib/geo-scope";
import { watershedQuery, interventionsQuery, INTERVENTION_LABELS, type Watershed } from "@/lib/geo";
import { getSatelliteAdapters } from "@/lib/satellite.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/change-detection")({
  head: () => ({ meta: [{ title: "Change Detection — JalDrishti AI" }, { name: "description", content: "Before vs after spatial change analysis between selected dates." }] }),
  component: ChangeDetection,
});

type FieldImage = {
  id: string;
  object_key: string;
  captured_at: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  intervention_id: string | null;
  observation: string | null;
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** One imagery panel of the side-by-side comparison. Navigation is synchronised by the parent. */
function ComparePane({
  watershed,
  opacity,
  onReady,
  label,
  date,
}: {
  watershed: Watershed;
  opacity: number;
  onReady: (map: MLMap) => void;
  label: string;
  date: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !ref.current) return;
      const map = new maplibregl.Map({
        container: ref.current,
        center: [watershed.center_lng, watershed.center_lat],
        zoom: 11,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            base: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" },
            imagery: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
            ws: { type: "geojson", data: { type: "Feature", properties: {}, geometry: watershed.boundary } },
          },
          layers: [
            { id: "base", type: "raster", source: "base", paint: { "raster-saturation": -0.7, "raster-opacity": 0.85 } },
            { id: "imagery", type: "raster", source: "imagery", paint: { "raster-opacity": opacity, "raster-saturation": -0.1 } },
            { id: "ws-fill", type: "fill", source: "ws", paint: { "fill-color": "#2f7d5d", "fill-opacity": 0.08 } },
            { id: "ws-line", type: "line", source: "ws", paint: { "line-color": "#2f7d5d", "line-width": 2 } },
          ],
        },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      map.on("load", () => {
        const coords = watershed.boundary.coordinates[0] ?? [];
        if (coords.length) {
          const b = coords.reduce(
            (acc, [lng, lat]) => acc.extend([lng!, lat!]),
            new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
          );
          map.fitBounds(b, { padding: 40, duration: 0 });
        }
        mapRef.current = map;
        onReady(map);
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watershed.id]);

  useEffect(() => {
    mapRef.current?.setPaintProperty("imagery", "raster-opacity", opacity);
  }, [opacity]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-mono text-xs">{date}</span>
      </div>
      <div ref={ref} className="h-[340px] w-full" />
    </div>
  );
}

function EvidenceList({ title, images, signed }: { title: string; images: FieldImage[]; signed: Record<string, string> }) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="font-mono text-xs text-muted-foreground">{images.length} photo{images.length === 1 ? "" : "s"}</span>
      </div>
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No field evidence captured in this period.</p>
      ) : (
        <ul className="space-y-3">
          {images.map((img) => (
            <li key={img.id} className="flex gap-3">
              {signed[img.id] ? (
                <img src={signed[img.id]} alt="Field evidence" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-muted"><Camera className="h-5 w-5 text-muted-foreground" /></div>
              )}
              <div className="min-w-0 text-xs">
                <p className="font-mono">{img.captured_at ? isoDay(new Date(img.captured_at)) : "Capture date unavailable"}</p>
                <p className="text-muted-foreground">{img.lat != null && img.lng != null ? `${img.lat.toFixed(5)}, ${img.lng.toFixed(5)}` : "GPS metadata unavailable"}</p>
                {img.observation && <p className="mt-1 line-clamp-2">{img.observation}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChangeDetection() {
  const scope = useGeoScope();
  const wsId = scope.watershedId;
  const ws = useQuery({ ...watershedQuery(wsId ?? ""), enabled: !!wsId });
  const adapters = useQuery({ queryKey: ["satellite-adapters"], queryFn: () => getSatelliteAdapters() });

  const today = useMemo(() => new Date(), []);
  const [afterDate, setAfterDate] = useState(isoDay(today));
  const [beforeDate, setBeforeDate] = useState(isoDay(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())));
  const [compared, setCompared] = useState(false);
  const [opacity, setOpacity] = useState(1);

  const mapsRef = useRef<MLMap[]>([]);
  const syncing = useRef(false);
  const registerMap = (map: MLMap) => {
    if (mapsRef.current.includes(map)) return;
    mapsRef.current.push(map);
    map.on("move", () => {
      if (syncing.current) return;
      syncing.current = true;
      for (const other of mapsRef.current) {
        if (other !== map) other.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
      }
      syncing.current = false;
    });
  };

  const images = useQuery({
    queryKey: ["field-images", "change", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("field_images").select("id, object_key, captured_at, created_at, lat, lng, intervention_id, observation").eq("watershed_id", wsId!).order("captured_at", { ascending: true }).limit(200);
      if (error) throw error;
      return data as FieldImage[];
    },
  });

  const signed = useQuery({
    queryKey: ["field-images-signed", (images.data ?? []).map((i) => i.id).join(",")],
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

  const ivs = useQuery(interventionsQuery(wsId ? [wsId] : []));

  const { beforeImgs, afterImgs } = useMemo(() => {
    const all = images.data ?? [];
    const b = new Date(beforeDate).getTime();
    const a = new Date(afterDate).getTime();
    const stamp = (i: FieldImage) => new Date(i.captured_at ?? i.created_at).getTime();
    return {
      beforeImgs: all.filter((i) => stamp(i) <= b),
      afterImgs: all.filter((i) => stamp(i) > b && stamp(i) <= a),
    };
  }, [images.data, beforeDate, afterDate]);

  const sentinel = adapters.data?.find((a) => a.id === "sentinel-2");
  const satelliteReady = sentinel?.status === "connected";

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Compare · Detect · Validate" title="Change Detection" description="Before vs after spatial change analysis. Observed differences are provisional and require contextual validation." />
      <GeoFilters />

      {!wsId ? (
        <EmptyState title="Select a watershed">Choose a state, district, block and watershed above to compare two periods.</EmptyState>
      ) : ws.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading watershed…</p>
      ) : !ws.data ? (
        <EmptyState title="Watershed not found">The selected watershed could not be loaded.</EmptyState>
      ) : (
        <>
          <div className="panel flex flex-wrap items-end gap-3 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="before-date">Before date</label>
              <Input id="before-date" type="date" value={beforeDate} max={afterDate} onChange={(e) => setBeforeDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="after-date">After date</label>
              <Input id="after-date" type="date" value={afterDate} min={beforeDate} max={isoDay(today)} onChange={(e) => setAfterDate(e.target.value)} className="w-44" />
            </div>
            <Button onClick={() => setCompared(true)} disabled={!beforeDate || !afterDate}>
              <GitCompareArrows className="mr-2 h-4 w-4" /> Compare periods
            </Button>
            <div className="ml-auto flex min-w-48 items-center gap-2">
              <span className="text-xs text-muted-foreground">Imagery opacity</span>
              <Slider value={[opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => setOpacity(v ?? 1)} className="w-32" />
            </div>
          </div>

          {!compared ? (
            <EmptyState title="No comparison run yet">Pick a before and after date, then run the comparison. Maps and field evidence for {ws.data.name} will appear here.</EmptyState>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <ComparePane watershed={ws.data} opacity={opacity} onReady={registerMap} label="Before" date={beforeDate} />
                <ComparePane watershed={ws.data} opacity={opacity} onReady={registerMap} label="After" date={afterDate} />
              </div>
              <p className="text-xs text-muted-foreground">
                Both panels show the same public imagery basemap (Esri World Imagery) with the watershed boundary. Dated, index-based change maps require a connected satellite source.
              </p>

              <div className="panel p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Satellite index comparison (NDVI · NDWI/MNDWI · LULC)</h3>
                  <StatusBadge status={satelliteReady ? "live" : "requires_configuration"} />
                </div>
                {satelliteReady ? (
                  <p className="text-sm text-muted-foreground">Satellite source connected. Index computation for the selected periods will run server-side.</p>
                ) : (
                  <ConfigRequiredState title="Integration requires configuration">
                    Observed vegetation and water index change between {beforeDate} and {afterDate} needs Sentinel-2 access. Add Copernicus Data Space credentials in Data Sources to activate this analysis. No estimated values are shown.
                  </ConfigRequiredState>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <EvidenceList title={`Field evidence on or before ${beforeDate}`} images={beforeImgs} signed={signed.data ?? {}} />
                <EvidenceList title={`Field evidence ${beforeDate} → ${afterDate}`} images={afterImgs} signed={signed.data ?? {}} />
              </div>

              <div className="panel p-4">
                <h3 className="mb-2 text-sm font-semibold">Interventions in {ws.data.name}</h3>
                {(ivs.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interventions recorded in this watershed.</p>
                ) : (
                  <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {(ivs.data ?? []).map((i) => (
                      <li key={i.id} className="rounded border border-border p-2">
                        <span className="font-medium">{INTERVENTION_LABELS[i.type]}</span>
                        <span className="block text-xs text-muted-foreground">{i.village} · implemented {i.implemented_on}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <CausalityNote />
            </>
          )}
        </>
      )}
    </div>
  );
}
