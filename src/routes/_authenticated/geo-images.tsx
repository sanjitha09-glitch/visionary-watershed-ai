import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import exifr from "exifr";
import { toast } from "sonner";
import { ImageUp, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, StatusBadge, CausalityNote, NoPermissionState } from "@/components/common/states";
import { WatershedMap } from "@/components/geo/WatershedMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { watershedsQuery, interventionsQuery, INTERVENTION_LABELS, type Watershed, type Intervention } from "@/lib/geo";
import { useCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/geo-images")({
  head: () => ({ meta: [{ title: "Geo-Image Intelligence — JalDrishti AI" }, { name: "description", content: "Upload geo-coded field images, extract EXIF location and link them to watersheds and interventions." }] }),
  component: GeoImages,
});

const MAX = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png"];

type Meta = { lat?: number; lng?: number; capturedAt?: string; device?: string };

function inPolygon(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!; const [xj, yj] = ring[j]!;
    if (yi! > lat !== yj! > lat && lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}
function km(a: [number, number], b: [number, number]) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function GeoImages() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const allWs = useQuery(watershedsQuery({}));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [manual, setManual] = useState({ lat: "", lng: "" });
  const [observation, setObservation] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const images = useQuery({
    queryKey: ["field-images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("field_images").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const onFile = useCallback(async (f: File) => {
    if (!TYPES.includes(f.type)) return toast.error("Only JPG, JPEG or PNG images are accepted.");
    if (f.size > MAX) return toast.error("Image exceeds the 15 MB limit.");
    setFile(f); setPreview(URL.createObjectURL(f)); setManual({ lat: "", lng: "" });
    try {
      const e = await exifr.parse(f, { gps: true, pick: ["DateTimeOriginal", "CreateDate", "Make", "Model", "latitude", "longitude"] });
      const d = e?.DateTimeOriginal ?? e?.CreateDate;
      setMeta({
        lat: typeof e?.latitude === "number" ? e.latitude : undefined,
        lng: typeof e?.longitude === "number" ? e.longitude : undefined,
        capturedAt: d instanceof Date ? d.toISOString() : undefined,
        device: [e?.Make, e?.Model].filter(Boolean).join(" ") || undefined,
      });
    } catch { setMeta({}); }
  }, []);

  const hasExifGps = meta?.lat != null && meta?.lng != null;
  const point = useMemo<[number, number] | null>(() => {
    if (hasExifGps) return [meta!.lat!, meta!.lng!];
    const la = parseFloat(manual.lat), ln = parseFloat(manual.lng);
    return isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? [la, ln] : null;
  }, [hasExifGps, meta, manual]);

  const watershed: Watershed | undefined = useMemo(() => point ? (allWs.data ?? []).find((w) => w.boundary?.coordinates?.[0] && inPolygon(point[1], point[0], w.boundary.coordinates[0])) : undefined, [point, allWs.data]);
  const ivs = useQuery(interventionsQuery(watershed ? [watershed.id] : []));
  const nearest: (Intervention & { d: number }) | undefined = useMemo(() => {
    if (!point || !ivs.data?.length || !watershed) return undefined;
    return ivs.data.map((i) => ({ ...i, d: km(point, [i.lat, i.lng]) })).sort((a, b) => a.d - b.d)[0];
  }, [point, ivs.data, watershed]);

  const canUpload = me?.can("evidence:upload");

  async function save() {
    if (!file || !me) return;
    setBusy(true);
    try {
      const hash = await sha256(file);
      const ext = file.type === "image/png" ? "png" : "jpg";
      const key = `${me.user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("field-images").upload(key, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("field_images").insert({
        uploaded_by: me.user.id, object_key: key, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size, sha256: hash,
        lat: point?.[0] ?? null, lng: point?.[1] ?? null,
        location_source: hasExifGps ? "exif" : point ? "manual" : "unavailable",
        captured_at: meta?.capturedAt ?? null, device: meta?.device ?? null,
        watershed_id: watershed?.id ?? null, intervention_id: nearest && nearest.d < 1 ? nearest.id : null,
        observation: observation.trim().slice(0, 1000) || null,
      });
      if (error) throw error;
      await logAudit("Image upload", "field_image", key);
      toast.success("Field evidence saved.");
      setFile(null); setPreview(undefined); setMeta(null); setObservation("");
      qc.invalidateQueries({ queryKey: ["field-images"] });
    } catch {
      toast.error("The image could not be saved. Please retry or contact an administrator.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader eyebrow="Capture · Locate · Contextualize" title="Geo-Image Intelligence" description="Upload geo-coded field photographs. Location and capture time are read from the image metadata — never inferred or fabricated." />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="panel space-y-4 p-4">
          {!canUpload ? <NoPermissionState>Uploading evidence requires the Field Monitor, Watershed Officer or Super Admin role.</NoPermissionState> : (
            <>
              <label
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm ${drag ? "border-teal bg-teal/5" : "border-border"}`}
              >
                {preview ? <img src={preview} alt="Selected field evidence" className="max-h-48 rounded" /> : <><ImageUp className="mb-2 h-6 w-6 text-muted-foreground" />Drop a JPG or PNG here, or click to choose<span className="mt-1 text-xs text-muted-foreground">Max 15 MB</span></>}
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
              {meta && (
                <div className="space-y-2 text-sm">
                  <div className="eyebrow">Extracted metadata</div>
                  <Row k="GPS">{hasExifGps ? `${meta.lat!.toFixed(6)}, ${meta.lng!.toFixed(6)}` : <span className="text-warning">GPS metadata unavailable</span>}</Row>
                  <Row k="Captured">{meta.capturedAt ? new Date(meta.capturedAt).toLocaleString("en-IN") : "Capture time unavailable"}</Row>
                  <Row k="Device">{meta.device ?? "Unavailable"}</Row>
                  {!hasExifGps && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Enter the verified location manually (recorded as manual):</div>
                      <div className="flex gap-2">
                        <Input placeholder="Latitude" value={manual.lat} onChange={(e) => setManual({ ...manual, lat: e.target.value })} />
                        <Input placeholder="Longitude" value={manual.lng} onChange={(e) => setManual({ ...manual, lng: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div className="eyebrow pt-2">Spatial association</div>
                  <Row k="Watershed">{watershed ? <Link to="/watersheds/$watershedId" params={{ watershedId: watershed.id }} className="text-teal">{watershed.name}</Link> : point ? "Outside mapped watersheds" : "—"}</Row>
                  <Row k="Nearest intervention">{nearest ? `${INTERVENTION_LABELS[nearest.type]} · ${nearest.village} (${nearest.d.toFixed(2)} km)${nearest.d >= 1 ? " — not linked, >1 km" : ""}` : "—"}</Row>
                  <Textarea placeholder="Field observation (optional)" value={observation} onChange={(e) => setObservation(e.target.value)} maxLength={1000} />
                  <Button className="w-full" onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save field evidence</Button>
                </div>
              )}
            </>
          )}
          <div className="rounded border p-3 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center justify-between"><span className="font-semibold text-foreground">AI image interpretation</span><StatusBadge status="requires_configuration" label="Model not connected" /></div>
            No validated interpretation model is connected, so no intervention type or confidence is predicted.
          </div>
        </div>
        <WatershedMap className="h-[620px]" watersheds={watershed ? [watershed] : allWs.data ?? []} interventions={ivs.data ?? []} selectedWatershedId={watershed?.id} focusPoint={point ? { lat: point[0], lng: point[1] } : undefined} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent field evidence</h2>
      {images.data?.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["File", "Location", "Source", "Captured", "Watershed", "Intervention", "Sync"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{images.data.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{i.file_name}</td>
                <td className="data-value px-3 py-2">{i.lat != null ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{i.lat.toFixed(5)}, {i.lng!.toFixed(5)}</span> : "Unavailable"}</td>
                <td className="px-3 py-2 capitalize">{i.location_source}</td>
                <td className="px-3 py-2">{i.captured_at ? new Date(i.captured_at).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2">{i.watershed_id ?? "—"}</td>
                <td className="px-3 py-2">{i.intervention_id ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status="connected" label={i.sync_status === "synced" ? "Synced" : i.sync_status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No field evidence uploaded yet" />}
      <CausalityNote className="mt-4" />
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="text-right">{children}</span></div>;
}
