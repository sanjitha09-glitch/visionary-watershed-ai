import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/change-detection")({
  head: () => ({ meta: [{ title: "Change Detection — JalDrishti AI" }, { name: "description", content: "Before vs after spatial change analysis between selected dates." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Change Detection" phase="Phase 5" description="Before vs after spatial change analysis between selected dates." />,
});
