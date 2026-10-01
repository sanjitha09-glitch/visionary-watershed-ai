import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/data-sources")({
  head: () => ({ meta: [{ title: "Data Sources & APIs — JalDrishti AI" }, { name: "description", content: "Manage satellite, GIS, storage and AI integrations and their connection status." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Data Sources & APIs" phase="Phase 9" description="Manage satellite, GIS, storage and AI integrations and their connection status." />,
});
