import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — JalDrishti AI" }, { name: "description", content: "Profile, security, notification and data preferences." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="Settings" phase="Phase 9" description="Profile, security, notification and data preferences." />,
});
