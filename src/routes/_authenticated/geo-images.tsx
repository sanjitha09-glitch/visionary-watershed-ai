import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/geo-images")({
  head: () => ({ meta: [{ title: "Geo-Image Intelligence — JalDrishti AI" }, { name: "description", content: "Upload geo-coded field images, extract EXIF location and link them to watersheds and interventions." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Geo-Image Intelligence" phase="Phase 3" description="Upload geo-coded field images, extract EXIF location and link them to watersheds and interventions." />,
});
