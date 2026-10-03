import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, MapPinned, Satellite, Layers, Sparkles, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { logAudit } from "@/lib/audit";
import terrain from "@/assets/watershed-terrain.jpg";

const searchSchema = z.object({ signedOut: z.boolean().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — JalDrishti AI" },
      { name: "description", content: "Secure sign-in to JalDrishti AI, an integrated geospatial platform for watershed monitoring." },
      { property: "og:title", content: "Sign in — JalDrishti AI" },
      { property: "og:description", content: "Connect field evidence, satellite observations and watershed intelligence." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

const FEATURES = [
  { icon: MapPinned, label: "Geo-coded Field Evidence" },
  { icon: Satellite, label: "Satellite Analytics" },
  { icon: Layers, label: "GIS & Spatial Analysis" },
  { icon: Sparkles, label: "AI-Assisted Insights" },
];

function AuthPage() {
  const { signedOut } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(signedOut ? "You have been signed out securely. Your session has been cleared." : null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !signedOut) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate, signedOut]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setError(em.error.issues[0]?.message ?? "Invalid email");
    if (mode !== "forgot") {
      const pw = passwordSchema.safeParse(password);
      if (!pw.success) return setError(pw.error.issues[0]?.message ?? "Invalid password");
    }
    if (mode === "signup" && fullName.trim().length < 2) return setError("Enter your full name");

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password });
        if (error) throw new Error(error.message.includes("Email not confirmed") ? "Please confirm your email address before signing in." : "The email or password is incorrect.");
        localStorage.setItem("jd-remember", remember ? "1" : "0");
        sessionStorage.setItem("jd-alive", "1");
        const { data } = await supabase.auth.getUser();
        if (data.user) await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
        await logAudit("Login", "session");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: em.data,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: fullName.trim().slice(0, 100), department: department.trim().slice(0, 120) || null },
          },
        });
        if (error) throw new Error(error.message);
        setMode("signin");
        setPassword("");
        setNotice("Account created. Check your email and confirm your address, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw new Error("We could not send the reset email. Please try again shortly.");
        setNotice("If an account exists for this email, a password reset link has been sent.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in could not be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <img src={terrain} alt="" width={1280} height={1600} className="absolute inset-0 h-full w-full object-cover" />
        <div className="contour-deep absolute inset-0 opacity-[0.86]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo inverted />
          <div className="max-w-lg">
            <div className="eyebrow !text-surface-deep-foreground/60">SIH26015 · Technology Prototype</div>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1]">Geospatial Intelligence for Smarter Watershed Development</h1>
            <p className="mt-5 text-[15px] leading-relaxed opacity-80">
              An integrated geospatial platform for connecting field evidence, satellite observations and watershed intelligence.
            </p>
            <ul className="mt-10 grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-3 text-sm font-medium">
                  <f.icon className="h-4 w-4 text-sidebar-primary" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="font-mono text-[11px] leading-relaxed opacity-60">
            Built for Smart India Hackathon 2026 · Problem sponsor: Ministry of Rural Development, Department of Land Resources.
            <br />
            Not an official Government of India portal.
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <div className="eyebrow">{mode === "signin" ? "Secure sign-in" : mode === "signup" ? "Request access" : "Account recovery"}</div>
          <h2 className="mt-2 text-2xl font-bold">
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin" && "Use your registered official email address."}
            {mode === "signup" && "New accounts start with Viewer access. An administrator assigns operational roles."}
            {mode === "forgot" && "We will email you a secure link to set a new password."}
          </p>

          {notice && (
            <div className="mt-6 flex gap-2 rounded-md border border-vegetation/30 bg-vegetation/10 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vegetation" />
              <span>{notice}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-6 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dept">Department / Organisation <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={120} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@department.gov.in" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => { setMode("forgot"); setError(null); }} className="text-xs font-medium text-teal hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </div>
            )}
            {mode === "signin" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                Remember me on this device
              </label>
            )}
            <Button type="submit" className="h-10 w-full font-semibold" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>No account? <button onClick={() => { setMode("signup"); setError(null); setNotice(null); }} className="font-semibold text-primary hover:underline">Create account</button></>
            ) : (
              <button onClick={() => { setMode("signin"); setError(null); }} className="font-semibold text-primary hover:underline">Back to sign in</button>
            )}
          </div>

          <div className="mt-10 flex items-center gap-2 border-t pt-5 font-mono text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted session · Role-based access · Activity audited
          </div>
        </div>
      </main>
    </div>
  );
}
