import { PageHeader, ConfigRequiredState } from "@/components/common/states";

/** Module whose analysis pipeline is scheduled for a later build phase. Shows honest status, never fake data. */
export function ModulePage({ eyebrow, title, description, phase }: { eyebrow: string; title: string; description: string; phase: string }) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <ConfigRequiredState title={`Scheduled for ${phase}`}>
        This module will activate once its data source and processing pipeline are connected. No placeholder results are shown.
      </ConfigRequiredState>
    </div>
  );
}
