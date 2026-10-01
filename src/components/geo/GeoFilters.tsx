import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statesQuery, districtsQuery, blocksQuery, watershedsQuery } from "@/lib/geo";
import { setGeoScope, useGeoScope, type Period } from "@/lib/geo-scope";
import { cn } from "@/lib/utils";

const ALL = "__all";

export function GeoFilters({ className, layout = "row", showPeriod = true }: { className?: string; layout?: "row" | "stack"; showPeriod?: boolean }) {
  const scope = useGeoScope();
  const states = useQuery(statesQuery);
  const districts = useQuery(districtsQuery(scope.stateId));
  const blocks = useQuery(blocksQuery(scope.districtId));
  const watersheds = useQuery({ ...watershedsQuery({ blockId: scope.blockId }), enabled: !!scope.blockId });

  const field = (label: string, value: string | undefined, onChange: (v?: string) => void, items: { id: string; name: string }[] | undefined, disabled: boolean, allLabel: string) => (
    <div className={cn("min-w-0", layout === "row" && "flex-1 min-w-[140px]")}>
      <div className="eyebrow mb-1">{label}</div>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)} disabled={disabled}>
        <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {items?.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className={cn(layout === "row" ? "flex flex-wrap gap-3" : "space-y-3", className)}>
      {field("State", scope.stateId, (v) => setGeoScope({ stateId: v }), states.data, false, "All states")}
      {field("District", scope.districtId, (v) => setGeoScope({ districtId: v }), districts.data, !scope.stateId, scope.stateId ? "All districts" : "Select a state")}
      {field("Block", scope.blockId, (v) => setGeoScope({ blockId: v }), blocks.data, !scope.districtId, scope.districtId ? "All blocks" : "Select a district")}
      {field("Watershed", scope.watershedId, (v) => setGeoScope({ watershedId: v }), watersheds.data, !scope.blockId, scope.blockId ? "All watersheds" : "Select a block")}
      {showPeriod && (
        <div className={cn(layout === "row" && "w-[150px]")}>
          <div className="eyebrow mb-1">Time period</div>
          <Select value={scope.period} onValueChange={(v) => setGeoScope({ period: v as Period })}>
            <SelectTrigger className="h-9 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="24m">Last 24 months</SelectItem>
              <SelectItem value="36m">Last 36 months</SelectItem>
              <SelectItem value="all">All records</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
