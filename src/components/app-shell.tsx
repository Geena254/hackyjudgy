import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, displayName, initials } from "@/hooks/use-auth";
import { BrandLink, SiteFooter } from "@/components/brand";

const adminNav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/events", label: "Events" },
  { to: "/submissions", label: "Submissions" },
  { to: "/judges", label: "Judges" },
  { to: "/analytics", label: "Analytics" },
  { to: "/integrations", label: "Integrations" },
  { to: "/portal", label: "Portal" },
] as const;

const judgeNav = [
  { to: "/judge", label: "My Dashboard" },
  { to: "/scoring", label: "Scoring Queue" },
  { to: "/results", label: "Results" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user, isAdmin, ready } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const name = displayName(user);
  const nav = !ready ? [] : isAdmin ? adminNav : judgeNav;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <BrandLink />
            <nav className="hidden items-center gap-1 lg:flex">
              {nav.map((n) => {
                const active = pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                      (active
                        ? "bg-teal-soft text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted")
                    }
                    style={active ? { color: "var(--teal)" } : undefined}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "var(--teal)" }}
                >
                  {initials(name)}
                </span>
                <span className="hidden max-w-[12rem] truncate text-foreground md:inline">
                  {name}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </button>
              {menu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-popover py-1 shadow-md"
                  onMouseLeave={() => setMenu(false)}
                >
                  <div className="border-b border-border px-3 py-2">
                    <div className="truncate text-sm font-medium text-foreground">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {isAdmin ? "Event admin" : "Judge"}
                    </div>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setMenu(false)}
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={signOut}
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
            <button
              className="rounded-md border border-border p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="flex flex-col p-2">
              {nav.map((n) => {
                const active = pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={
                      "rounded-md px-3 py-2.5 text-sm font-medium " +
                      (active ? "bg-teal-soft" : "text-muted-foreground hover:bg-muted")
                    }
                    style={active ? { color: "var(--teal)" } : undefined}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Settings
              </Link>
              <button
                onClick={signOut}
                className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-lg border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] " +
        className
      }
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = "teal",
  variant = "solid",
}: {
  children: ReactNode;
  tone?: "teal" | "magenta" | "gray" | "warning";
  variant?: "solid" | "outline";
}) {
  const styles: Record<string, React.CSSProperties> = {
    teal:
      variant === "solid"
        ? { background: "var(--teal)", color: "#fff" }
        : { border: "1px solid var(--teal)", color: "var(--teal)" },
    magenta:
      variant === "solid"
        ? { background: "var(--magenta)", color: "#fff" }
        : { border: "1px solid var(--magenta)", color: "var(--magenta)" },
    gray:
      variant === "solid"
        ? { background: "var(--muted)", color: "var(--foreground)" }
        : { border: "1px solid var(--border)", color: "var(--muted-foreground)" },
    warning: { background: "var(--warning)", color: "var(--warning-foreground)" },
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  tone = "teal",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  tone?: "teal" | "magenta";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const color = tone === "teal" ? "var(--teal)" : "var(--magenta)";
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: color, color: "#fff" }
      : variant === "outline"
        ? { border: `1px solid ${color}`, color, background: "transparent" }
        : { color, background: "transparent" };
  return (
    <button
      {...props}
      style={{ ...style, ...(props.style ?? {}) }}
      className={
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-50 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function ProgressBar({
  value,
  tone = "teal",
}: {
  value: number;
  tone?: "teal" | "magenta";
}) {
  const color = tone === "teal" ? "var(--teal)" : "var(--magenta)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}
