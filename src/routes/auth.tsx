import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Card, Button } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const raw = s.next;
    const safe =
      typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;
    return safe ? { next: safe } : {};
  },


  head: () => ({
    meta: [
      { title: "Sign in — EvalDesk by Power Learn Project" },
      {
        name: "description",
        content:
          "Sign in or create your EvalDesk account to manage hackathon events, submissions and judging.",
      },
      { property: "og:title", content: "Sign in — EvalDesk" },
      { property: "og:description", content: "Access the EvalDesk judging and scoring platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function Field({
  icon,
  ...props
}: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{props.title}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          {...props}
          title={undefined}
          className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary"
        />
      </span>
    </label>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const goNext = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/dashboard" });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (next) window.location.href = next;
      else navigate({ to: "/dashboard" });
    });
  }, [navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (data.session) goNext();
        else setMsg("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        goNext();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${next ?? ""}`,
    });
    if (result.error) {
      setErr("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    goNext();
  }


  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="EvalDesk home">
            <PlpLogo className="h-10" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "signin" ? "Sign in to EvalDesk" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Admins and judges use the same sign-in."
              : "Invited judges should sign up with the email that received the invitation."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field
                icon={<User className="h-4 w-4" strokeWidth={2} />}
                title="Full name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                maxLength={120}
                required
              />
            )}
            <Field
              icon={<Mail className="h-4 w-4" strokeWidth={2} />}
              title="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={255}
              required
            />
            <Field
              icon={<Lock className="h-4 w-4" strokeWidth={2} />}
              title="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              maxLength={72}
              required
            />

            {err && <p className="text-sm font-medium text-destructive">{err}</p>}
            {msg && (
              <p className="text-sm font-medium" style={{ color: "var(--teal)" }}>
                {msg}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to EvalDesk?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErr(null);
                setMsg(null);
              }}
              className="font-semibold"
              style={{ color: "var(--teal)" }}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
