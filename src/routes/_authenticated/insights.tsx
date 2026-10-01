import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/common/ModulePage";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "AI Spatial Insights — JalDrishti AI" }, { name: "description", content: "Explainable, evidence-linked AI summaries of structured spatial analysis." }] }),
  component: () => <ModulePage eyebrow="JalDrishti AI" title="AI Spatial Insights" phase="Phase 7" description="Explainable, evidence-linked AI summaries of structured spatial analysis." />,
});
