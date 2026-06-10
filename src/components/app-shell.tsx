import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/events", label: "Events" },
  { to: "/submissions", label: "Submissions" },
  { to: "/judges", label: "Judges" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="EvalDesk home">
      <span className="flex items-center">
        <span
          aria-hidden
          className="inline-block h-7 w-7 rounded-md"
          style={{ background: "var(--teal)" }}
        />
        <span
          aria-hidden
          className="-ml-2 inline-block h-7 w-7 rounded-md"
          style={{ background: "var(--magenta)" }}
        />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
        Eval<span style={{ color: "var(--magenta)" }}>Desk</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 min-w-0">
            <Logo />
            <nav className="hidden lg:flex items-center gap-1">
              {nav.map((n) => {
                const active =
                  n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
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
                  style={{ background: "var(--magenta)" }}
                >
                  AM
                </span>
                <span className="hidden md:inline text-foreground">Alex Morgan</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </button>
              {menu && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover py-1 shadow-md"
                  onMouseLeave={() => setMenu(false)}
                >
                  {["Profile", "Preferences", "Help", "Sign out"].map((i) => (
                    <button
                      key={i}
                      className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="lg:hidden rounded-md border border-border p-2"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="lg:hidden border-t border-border bg-background">
            <nav className="flex flex-col p-2">
              {nav.map((n) => {
                const active =
                  n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={
                      "rounded-md px-3 py-2.5 text-sm font-medium " +
                      (active
                        ? "bg-teal-soft"
                        : "text-muted-foreground hover:bg-muted")
                    }
                    style={active ? { color: "var(--teal)" } : undefined}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
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
