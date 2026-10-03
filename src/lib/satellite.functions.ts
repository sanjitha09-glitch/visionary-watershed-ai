import { createServerFn } from "@tanstack/react-start";

export type AdapterStatus = "connected" | "authentication_required" | "unavailable";
export type Adapter = { id: string; name: string; provider: string; type: string; status: AdapterStatus; note: string };

/** Reports satellite adapter readiness. Only checks whether credentials exist server-side — values are never returned. */
export const getSatelliteAdapters = createServerFn({ method: "GET" }).handler(async (): Promise<Adapter[]> => {
  const has = (k: string) => !!process.env[k];
  const sentinel = has("COPERNICUS_CLIENT_ID") && has("COPERNICUS_CLIENT_SECRET");
  return [
    { id: "sentinel-2", name: "Sentinel-2 L2A", provider: "Copernicus Data Space (ESA)", type: "Optical multispectral, 10 m", status: sentinel ? "connected" : "authentication_required", note: sentinel ? "Credentials configured on the server." : "Add Copernicus Data Space credentials to enable NDVI, NDWI and MNDWI." },
    { id: "landsat", name: "Landsat 8/9 C2 L2", provider: "USGS / NASA", type: "Optical multispectral, 30 m", status: "unavailable", note: "Adapter defined; connection not yet configured." },
    { id: "srishti-drishti", name: "SRISHTI-DRISHTI", provider: "Department of Land Resources", type: "Authorized government geospatial source", status: "authentication_required", note: "Requires official authorization. No live access is claimed." },
  ];
});
