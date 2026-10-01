import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/satellite")({
  head: () => ({ meta: [{ title: "Satellite Analytics — JalDrishti AI" }, { name: "description", content: "NDVI, NDWI, MNDWI and land use / land cover analysis from connected Earth observation sources." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Satellite Analytics" phase="Phase 4" description="NDVI, NDWI, MNDWI and land use / land cover analysis from connected Earth observation sources." />,
});
