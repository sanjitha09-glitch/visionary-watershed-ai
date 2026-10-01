import {
  LayoutDashboard, Map, Camera, Satellite, GitCompareArrows, Construction, HeartPulse,
  Sparkles, FileText, Plug, Bell, ScrollText, Settings, type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/watersheds", label: "Watershed Explorer", icon: Map },
  { to: "/geo-images", label: "Geo-Image Intelligence", icon: Camera },
  { to: "/satellite", label: "Satellite Analytics", icon: Satellite },
  { to: "/change-detection", label: "Change Detection", icon: GitCompareArrows },
  { to: "/interventions", label: "Intervention Intelligence", icon: Construction },
  { to: "/health", label: "Watershed Health & Risk", icon: HeartPulse },
  { to: "/insights", label: "AI Spatial Insights", icon: Sparkles },
  { to: "/reports", label: "Reports & Compliance", icon: FileText },
  { to: "/data-sources", label: "Data Sources & APIs", icon: Plug, adminOnly: true },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/audit", label: "Audit & Activity", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const WORKFLOW_STEPS = ["Capture", "Locate", "Contextualize", "Analyze", "Compare", "Interpret", "Validate", "Decide", "Report"] as const;
