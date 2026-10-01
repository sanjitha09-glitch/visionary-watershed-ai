import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports & Compliance — JalDrishti AI" }, { name: "description", content: "Generate professional watershed assessment and monitoring reports." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Reports & Compliance" phase="Phase 8" description="Generate professional watershed assessment and monitoring reports." />,
});
