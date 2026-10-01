import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — JalDrishti AI" }, { name: "description", content: "Alerts for new evidence, completed analyses, data quality issues and reviews." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Notifications" phase="Phase 9" description="Alerts for new evidence, completed analyses, data quality issues and reviews." />,
});
