import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, LogOut, Mail, ShieldCheck, User } from "lucide-react";
import { AppShell, Button, Card, Pill } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, displayName } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GavelLab" },
      {
        name: "description",
        content:
          "Manage your GavelLab account, hackathon preferences and judging panel settings in one place.",
      },
      { property: "og:title", content: "Account & event settings — GavelLab" },
      {
        property: "og:description",
        content: "Manage your account details, hackathon preferences and judging panel settings.",
      },
      { property: "og:url", content: "https://hackyjudgy.lovable.app/settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{title}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground";

function SettingsPage() {
  const { user, roles, isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) setName(displayName(user) === user.email ? "" : displayName(user));
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingName(true);
    setErr(null);
    setNameMsg(null);
    try {
      const fullName = name.trim();
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) throw error;
      await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", user.id);
      setNameMsg("Your name has been updated.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save your details.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setErr(null);
    if (password.length < 8) {
      setErr("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setErr("The two passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setPwMsg("Password changed. Use it next time you sign in.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not change your password.");
    } finally {
      setSavingPw(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your details, change your password and review your access.
        </p>
      </div>

      {err && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--magenta)", color: "var(--magenta)" }}
        >
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
            <h2 className="text-lg font-bold text-foreground">Your details</h2>
          </div>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <Row title="Full name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                maxLength={120}
              />
            </Row>
            <Row title="Email" hint="Your email is used to sign in and cannot be changed here.">
              <input className={inputClass} value={user?.email ?? ""} disabled />
            </Row>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingName}>
                {savingName ? "Saving…" : "Save details"}
              </Button>
              {nameMsg && <span className="text-sm text-muted-foreground">{nameMsg}</span>}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
            <h2 className="text-lg font-bold text-foreground">Password</h2>
          </div>
          <form onSubmit={savePassword} className="mt-4 space-y-4">
            <Row title="New password" hint="At least 8 characters.">
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Row>
            <Row title="Confirm new password">
              <input
                className={inputClass}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Row>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingPw}>
                {savingPw ? "Updating…" : "Change password"}
              </Button>
              {pwMsg && <span className="text-sm text-muted-foreground">{pwMsg}</span>}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
            <h2 className="text-lg font-bold text-foreground">Your access</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {roles.length === 0 && <Pill tone="gray">No role assigned yet</Pill>}
            {roles.map((r) => (
              <Pill key={r} tone={r === "admin" ? "magenta" : "teal"}>
                {r === "admin" ? "Organiser" : "Judge"}
              </Pill>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isAdmin
              ? "You can create hackathons, manage rubrics and invite judges."
              : "You can score the submissions assigned to you and review your own results."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {isAdmin ? (
              <>
                <Link
                  to="/judges"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <Mail className="h-4 w-4" strokeWidth={2} /> Manage judges
                </Link>
                <Link
                  to="/integrations"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Connected assistants
                </Link>
              </>
            ) : (
              <Link
                to="/results"
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                My results
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5" style={{ color: "var(--magenta)" }} strokeWidth={2} />
            <h2 className="text-lg font-bold text-foreground">Session</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign out of GavelLab on this device.
          </p>
          <Button className="mt-4" variant="outline" tone="magenta" onClick={signOut}>
            Sign out
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
