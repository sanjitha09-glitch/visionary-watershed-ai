import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit & Activity — JalDrishti AI" }, { name: "description", content: "Record of logins, uploads, analyses, reports and data-source synchronisation." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Audit & Activity" phase="Phase 9" description="Record of logins, uploads, analyses, reports and data-source synchronisation." />,
});
