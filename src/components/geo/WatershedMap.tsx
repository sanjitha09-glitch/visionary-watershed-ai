import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Map as MLMap, GeoJSONSource, LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, Ruler, X, Camera, Satellite, Play, FileText, Info } from "lucide-react";
import { INTERVENTION_COLORS, INTERVENTION_LABELS, STATUS_LABELS, type Intervention, type Watershed, type InterventionType } from "@/lib/geo";
import { StatusBadge, type DataStatus } from "@/components/common/states";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type LayerKey =
  | "boundary" | "interventions" | "satellite"
  | "micro" | "drainage" | "water" | "vegetation" | "ndwi" | "lulc" | "change" | "risk" | "images";

type LayerDef = { key: LayerKey; label: string; available: boolean; status?: DataStatus; note?: string };

const LAYERS: LayerDef[] = [
  { key: "satellite", label: "Satellite Imagery (basemap)", available: true, status: "live", note: "Esri World Imagery, public tiles" },
  { key: "boundary", label: "Watershed Boundary", available: true, status: "archived" },
  { key: "interventions", label: "Interventions", available: true, status: "archived" },
  { key: "micro", label: "Micro-watersheds", available: false, status: "requires_configuration" },
  { key: "drainage", label: "Drainage Network", available: false, status: "requires_configuration" },
  { key: "water", label: "Water Bodies", available: false, status: "requires_configuration" },
  { key: "images", label: "Geo-coded Field Images", available: false, status: "unavailable", note: "No field images uploaded yet" },
  { key: "vegetation", label: "Vegetation (NDVI)", available: false, status: "requires_configuration" },
  { key: "ndwi", label: "Water Index (NDWI)", available: false, status: "requires_configuration" },
  { key: "lulc", label: "Land Use / Land Cover", available: false, status: "requires_configuration" },
  { key: "change", label: "Change Detection", available: false, status: "requires_configuration" },
  { key: "risk", label: "Risk / Priority Zones", available: false, status: "requires_configuration" },
];

function readVar(name: string) {
  if (typeof window === "undefined") return "#336";
  const probe = document.createElement("span");
  probe.style.color = name;
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function WatershedMap({
  watersheds,
  interventions,
  selectedWatershedId,
  onSelectWatershed,
  focusPoint,
  className,
}: {
  watersheds: Watershed[];
  interventions: Intervention[];
  selectedWatershedId?: string;
  onSelectWatershed?: (id: string) => void;
  focusPoint?: { lat: number; lng: number };
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({ satellite: true, boundary: true, interventions: true });
  const [selected, setSelected] = useState<Intervention | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [measurePts, setMeasurePts] = useState<[number, number][]>([]);
  const measuringRef = useRef(false);
  measuringRef.current = measuring;
  const selectWsRef = useRef(onSelectWatershed);
  selectWsRef.current = onSelectWatershed;
  const intvRef = useRef(interventions);
  intvRef.current = interventions;

  const wsGeo = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: watersheds.map((w) => ({ type: "Feature" as const, id: undefined, properties: { id: w.id, name: w.name, selected: w.id === selectedWatershedId }, geometry: w.boundary })),
    }),
    [watersheds, selectedWatershedId],
  );
  const ivGeo = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: interventions.map((i) => ({ type: "Feature" as const, properties: { id: i.id, type: i.type }, geometry: { type: "Point" as const, coordinates: [i.lng, i.lat] } })),
    }),
    [interventions],
  );

  // Initialise map once (browser only).
  useEffect(() => {
    let cancelled = false;
    let map: MLMap | undefined;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        center: [78.9, 19.5],
        zoom: 4.3,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            satellite: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
            osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" },
          },
          layers: [
            { id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.6, "raster-opacity": 0.9 } },
            { id: "satellite", type: "raster", source: "satellite", paint: { "raster-saturation": -0.15 } },
          ],
        },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.FullscreenControl(), "top-right");
      map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

      map.on("load", () => {
        const teal = readVar("var(--sidebar-primary)");
        const warn = readVar("var(--warning)");
        map!.addSource("watersheds", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map!.addSource("interventions", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map!.addSource("measure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map!.addLayer({ id: "ws-fill", type: "fill", source: "watersheds", paint: { "fill-color": ["case", ["get", "selected"], warn, teal], "fill-opacity": ["case", ["get", "selected"], 0.22, 0.12] } });
        map!.addLayer({ id: "ws-line", type: "line", source: "watersheds", paint: { "line-color": ["case", ["get", "selected"], warn, teal], "line-width": ["case", ["get", "selected"], 2.6, 1.4] } });
        const colorMatch: unknown[] = ["match", ["get", "type"]];
        (Object.keys(INTERVENTION_COLORS) as InterventionType[]).forEach((t) => colorMatch.push(t, readVar(INTERVENTION_COLORS[t])));
        colorMatch.push("#888");
        map!.addLayer({
          id: "iv-circle", type: "circle", source: "interventions",
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 6, 14, 9], "circle-color": colorMatch as never, "circle-stroke-color": "#fff", "circle-stroke-width": 1.4 },
        });
        map!.addLayer({ id: "measure-line", type: "line", source: "measure", paint: { "line-color": warn, "line-width": 2, "line-dasharray": [2, 1] } });
        map!.addLayer({ id: "measure-pt", type: "circle", source: "measure", filter: ["==", "$type", "Point"], paint: { "circle-radius": 4, "circle-color": warn } });

        map!.on("click", "iv-circle", (e) => {
          if (measuringRef.current) return;
          const id = e.features?.[0]?.properties?.id as string;
          setSelected(intvRef.current.find((i) => i.id === id) ?? null);
        });
        map!.on("click", "ws-fill", (e) => {
          if (measuringRef.current) return;
          const hitIv = map!.queryRenderedFeatures(e.point, { layers: ["iv-circle"] });
          if (hitIv.length) return;
          const id = e.features?.[0]?.properties?.id as string;
          if (id) selectWsRef.current?.(id);
        });
        map!.on("click", (e) => {
          if (!measuringRef.current) return;
          setMeasurePts((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
        });
        ["iv-circle", "ws-fill"].forEach((l) => {
          map!.on("mouseenter", l, () => (map!.getCanvas().style.cursor = "pointer"));
          map!.on("mouseleave", l, () => (map!.getCanvas().style.cursor = ""));
        });
        mapRef.current = map!;
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Data sync
  useEffect(() => {
    if (!ready) return;
    (mapRef.current!.getSource("watersheds") as GeoJSONSource).setData(wsGeo as never);
    (mapRef.current!.getSource("interventions") as GeoJSONSource).setData(ivGeo as never);
  }, [ready, wsGeo, ivGeo]);

  // Fit to data / selection
  useEffect(() => {
    if (!ready || !watersheds.length) return;
    const target = selectedWatershedId ? watersheds.filter((w) => w.id === selectedWatershedId) : watersheds;
    const coords = target.flatMap((w) => w.boundary.coordinates[0]);
    if (!coords.length) return;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    mapRef.current!.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 12.5, duration: 900 });
  }, [ready, watersheds, selectedWatershedId]);

  useEffect(() => {
    if (ready && focusPoint) mapRef.current!.flyTo({ center: [focusPoint.lng, focusPoint.lat] as LngLatLike, zoom: 12 });
  }, [ready, focusPoint]);

  // Layer visibility
  useEffect(() => {
    if (!ready) return;
    const m = mapRef.current!;
    m.setLayoutProperty("satellite", "visibility", visible.satellite ? "visible" : "none");
    ["ws-fill", "ws-line"].forEach((l) => m.setLayoutProperty(l, "visibility", visible.boundary ? "visible" : "none"));
    m.setLayoutProperty("iv-circle", "visibility", visible.interventions ? "visible" : "none");
  }, [ready, visible]);

  // Measurement rendering
  useEffect(() => {
    if (!ready) return;
    const features: unknown[] = measurePts.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: p } }));
    if (measurePts.length > 1) features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: measurePts } });
    (mapRef.current!.getSource("measure") as GeoJSONSource).setData({ type: "FeatureCollection", features } as never);
  }, [ready, measurePts]);

  const distance = measurePts.reduce((acc, p, i) => (i ? acc + haversineKm(measurePts[i - 1], p) : 0), 0);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-muted", className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Tool rail */}
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        <button onClick={() => setLayersOpen((o) => !o)} className={cn("flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-semibold shadow-sm", layersOpen && "border-ring")}>
          <Layers className="h-3.5 w-3.5" /> Layers
        </button>
        <button
          onClick={() => { setMeasuring((m) => !m); setMeasurePts([]); }}
          className={cn("flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-semibold shadow-sm", measuring && "border-warning bg-warning/15")}
        >
          <Ruler className="h-3.5 w-3.5" /> {measuring ? "Stop measuring" : "Measure"}
        </button>
      </div>

      {measuring && (
        <div className="absolute left-3 top-12 z-10 rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
          {measurePts.length < 2 ? "Click points on the map to measure distance." : <>Distance: <span className="data-value font-semibold">{distance.toFixed(2)} km</span></>}
        </div>
      )}

      {layersOpen && (
        <div className="absolute left-3 top-12 z-20 max-h-[calc(100%-5rem)] w-72 overflow-y-auto rounded-md border bg-card p-3 shadow-lg">
          <div className="eyebrow mb-2">Map layers</div>
          <ul className="space-y-2">
            {LAYERS.map((l) => (
              <li key={l.key} className="flex items-start gap-2">
                <Switch checked={!!visible[l.key]} disabled={!l.available} onCheckedChange={(v) => setVisible((s) => ({ ...s, [l.key]: v }))} className="mt-0.5 scale-90" />
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[13px] font-medium", !l.available && "text-muted-foreground")}>{l.label}</div>
                  {l.status && <StatusBadge status={l.status} className="mt-0.5" />}
                  {l.note && <div className="mt-0.5 text-[11px] text-muted-foreground">{l.note}</div>}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">Thematic layers activate when the corresponding satellite or GIS source is connected in Data Sources.</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 right-3 z-10 hidden rounded-md border bg-card/95 p-2.5 text-[11px] shadow-sm sm:block">
        <div className="eyebrow mb-1.5">Interventions</div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {(Object.keys(INTERVENTION_LABELS) as InterventionType[]).map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-card" style={{ background: INTERVENTION_COLORS[t] }} />
              {INTERVENTION_LABELS[t]}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-1.5 border-t pt-1.5"><span className="h-2.5 w-4 rounded-sm border-2 border-sidebar-primary" /> Watershed boundary</div>
      </div>

      {/* Intervention summary */}
      {selected && (
        <div className="absolute right-3 top-3 z-20 w-80 rounded-lg border bg-card shadow-xl">
          <div className="flex items-start justify-between border-b p-3">
            <div>
              <div className="eyebrow">Intervention summary</div>
              <div className="mt-0.5 font-mono text-[13px] font-semibold">{selected.id}</div>
            </div>
            <button onClick={() => setSelected(null)} aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-xs">
            <dt className="text-muted-foreground">Type</dt><dd className="font-medium">{INTERVENTION_LABELS[selected.type]}</dd>
            <dt className="text-muted-foreground">Village</dt><dd className="font-medium">{selected.village}</dd>
            <dt className="text-muted-foreground">Coordinates</dt><dd className="data-value">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</dd>
            <dt className="text-muted-foreground">Date</dt><dd className="data-value">{selected.implemented_on}</dd>
            <dt className="text-muted-foreground">Status</dt><dd className="font-medium">{STATUS_LABELS[selected.status]}</dd>
            <dt className="text-muted-foreground">Field evidence</dt><dd className="data-value">{selected.evidence_count} images</dd>
          </dl>
          <div className="flex items-center gap-1.5 px-3 pb-2 text-[11px] text-muted-foreground"><Info className="h-3 w-3" /> Source: reference dataset (development)</div>
          <div className="grid grid-cols-2 gap-1.5 border-t p-2 text-xs">
            <Link to="/watersheds/$watershedId" params={{ watershedId: selected.watershed_id }} className="col-span-2 rounded-md bg-primary px-2 py-1.5 text-center font-semibold text-primary-foreground">View Details</Link>
            <Link to="/geo-images" className="flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted"><Camera className="h-3 w-3" /> View Photos</Link>
            <Link to="/satellite" className="flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted"><Satellite className="h-3 w-3" /> Satellite Context</Link>
            <Link to="/satellite" className="flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted"><Play className="h-3 w-3" /> Run Analysis</Link>
            <Link to="/reports" className="flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted"><FileText className="h-3 w-3" /> Generate Report</Link>
          </div>
        </div>
      )}
    </div>
  );
}
