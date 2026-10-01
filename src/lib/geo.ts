import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Watershed = {
  id: string;
  block_id: string;
  name: string;
  area_ha: number;
  center_lat: number;
  center_lng: number;
  boundary: { type: "Polygon"; coordinates: number[][][] };
  drainage_km: number | null;
  water_bodies: number | null;
  data_origin: string;
  data_status: string;
  source: string;
  updated_at: string;
};

export type Intervention = {
  id: string;
  watershed_id: string;
  type: InterventionType;
  village: string;
  lat: number;
  lng: number;
  implemented_on: string;
  status: MonitoringStatus;
  evidence_count: number;
  data_origin: string;
};

export type InterventionType = "check_dam" | "farm_pond" | "plantation" | "water_conservation" | "land_treatment" | "drainage_treatment" | "other";
export type MonitoringStatus = "monitored" | "requires_review" | "data_incomplete" | "analysis_available" | "pending_validation";

export const INTERVENTION_LABELS: Record<InterventionType, string> = {
  check_dam: "Check Dam",
  farm_pond: "Farm Pond",
  plantation: "Plantation",
  water_conservation: "Water Conservation Structure",
  land_treatment: "Land Treatment",
  drainage_treatment: "Drainage Treatment",
  other: "Other",
};

/** CSS variable per intervention type, used for map markers and legends. */
export const INTERVENTION_COLORS: Record<InterventionType, string> = {
  check_dam: "var(--water)",
  farm_pond: "var(--teal)",
  plantation: "var(--vegetation)",
  water_conservation: "oklch(0.45 0.09 230)",
  land_treatment: "oklch(0.55 0.08 60)",
  drainage_treatment: "oklch(0.5 0.06 280)",
  other: "oklch(0.55 0.02 220)",
};

export const STATUS_LABELS: Record<MonitoringStatus, string> = {
  monitored: "Monitored",
  requires_review: "Requires Review",
  data_incomplete: "Data Incomplete",
  analysis_available: "Analysis Available",
  pending_validation: "Pending Validation",
};

export const DATA_ORIGIN_LABEL: Record<string, string> = {
  reference_dataset: "Reference dataset (development)",
};

export const statesQuery = queryOptions({
  queryKey: ["states"],
  queryFn: async () => {
    const { data, error } = await supabase.from("states").select("*").order("name");
    if (error) throw error;
    return data;
  },
  staleTime: Infinity,
});

export const districtsQuery = (stateId?: string) =>
  queryOptions({
    queryKey: ["districts", stateId],
    enabled: !!stateId,
    queryFn: async () => {
      const { data, error } = await supabase.from("districts").select("*").eq("state_id", stateId!).order("name");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

export const blocksQuery = (districtId?: string) =>
  queryOptions({
    queryKey: ["blocks", districtId],
    enabled: !!districtId,
    queryFn: async () => {
      const { data, error } = await supabase.from("blocks").select("*").eq("district_id", districtId!).order("name");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

export type GeoScope = { stateId?: string | undefined; districtId?: string | undefined; blockId?: string | undefined; watershedId?: string | undefined };

/** Watersheds visible for a geographic scope. Prefix-matching on hierarchical IDs keeps the query index-friendly. */
export const watershedsQuery = (scope: GeoScope) =>
  queryOptions({
    queryKey: ["watersheds", scope.stateId, scope.districtId, scope.blockId],
    queryFn: async () => {
      let q = supabase.from("watersheds").select("*").order("name").limit(500);
      const prefix = scope.blockId ?? scope.districtId ?? scope.stateId;
      if (prefix) q = q.like("block_id", `${prefix}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Watershed[];
    },
  });

export const interventionsQuery = (watershedIds: string[]) =>
  queryOptions({
    queryKey: ["interventions", watershedIds],
    enabled: watershedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("interventions").select("*").in("watershed_id", watershedIds).limit(2000);
      if (error) throw error;
      return data as Intervention[];
    },
  });

export const watershedQuery = (id: string) =>
  queryOptions({
    queryKey: ["watershed", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watersheds")
        .select("*, blocks(name, districts(name, states(name)))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as (Watershed & { blocks: { name: string; districts: { name: string; states: { name: string } } } }) | null;
    },
  });
