import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export type AppRole =
  | "super_admin"
  | "state_admin"
  | "district_officer"
  | "watershed_officer"
  | "field_monitor"
  | "analyst"
  | "viewer";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  state_admin: "State Admin",
  district_officer: "District Officer",
  watershed_officer: "Watershed Officer",
  field_monitor: "Field Monitor",
  analyst: "Analyst",
  viewer: "Viewer",
};

export type Permission =
  | "evidence:upload"
  | "interventions:update"
  | "analysis:run"
  | "reports:generate"
  | "reports:review"
  | "users:manage"
  | "integrations:manage"
  | "audit:view";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: ["evidence:upload", "interventions:update", "analysis:run", "reports:generate", "reports:review", "users:manage", "integrations:manage", "audit:view"],
  state_admin: ["interventions:update", "analysis:run", "reports:generate", "reports:review", "users:manage", "integrations:manage", "audit:view"],
  district_officer: ["interventions:update", "reports:review"],
  watershed_officer: ["evidence:upload", "interventions:update", "reports:review"],
  field_monitor: ["evidence:upload", "interventions:update"],
  analyst: ["analysis:run", "reports:generate"],
  viewer: [],
};

export type Profile = {
  id: string;
  full_name: string | null;
  department: string | null;
  assigned_geography: string | null;
  email: string | null;
  last_login_at: string | null;
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      const perms = new Set(roleList.flatMap((r) => ROLE_PERMISSIONS[r]));
      return {
        user: u.user,
        profile: profile as Profile | null,
        roles: roleList,
        primaryRole: (roleList[0] ?? "viewer") as AppRole,
        can: (p: Permission) => perms.has(p),
      };
    },
    staleTime: 60_000,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await logAudit("Logout", "session");
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { signedOut: true }, replace: true });
  };
}
