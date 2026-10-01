import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/interventions")({
  head: () => ({ meta: [{ title: "Intervention Intelligence — JalDrishti AI" }, { name: "description", content: "Spatial and temporal intelligence records for every watershed intervention." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Intervention Intelligence" phase="Phase 6" description="Spatial and temporal intelligence records for every watershed intervention." />,
});
