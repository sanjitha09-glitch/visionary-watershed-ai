import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({ meta: [{ title: "Watershed Health & Risk — JalDrishti AI" }, { name: "description", content: "Analytical monitoring-priority indicators and spatial priority zones." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Watershed Health & Risk" phase="Phase 6" description="Analytical monitoring-priority indicators and spatial priority zones." />,
});
