import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Plug,
  Scale,
  Search,
  Sparkles,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, displayName, initials } from "@/hooks/use-auth";
import { BrandLink, SiteFooter } from "@/components/brand";
import { HackathonPicker } from "@/components/hackathon-picker";
import { useSelectedEvent } from "@/hooks/use-selected-event";
import { useEvents, formatDate } from "@/lib/hackathon";

/** One hackathon picker for the whole workspace; every page follows it. */
function HackathonBar() {
  const { data: events = [] } = useEvents();
  const [event, setEvent] = useSelectedEvent(events);
  if (events.length < 2) return null;
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hackathon
        </span>
        <HackathonPicker events={events} value={event?.id} onChange={setEvent} />
      </div>
    </div>
  );
}

const adminNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/submissions", label: "Submissions", icon: FolderOpen },
  { to: "/judges", label: "Judges", icon: Scale },
  { to: "/ai-grading", label: "AI grading", icon: Sparkles },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/integrations", label: "Integrations", icon: Plug },
] as const;

const judgeNav = [
  { to: "/judge", label: "My Dashboard" },
  { to: "/scoring", label: "Scoring Queue" },
  { to: "/results", label: "Results" },
] as const;

function NoAccess({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold text-foreground">You don't have judging access yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You're signed in as <strong className="text-foreground">{email}</strong>, but this account
        hasn't been added to the judging panel. If you were invited with a different email, sign
        out and use the link sent to that address - or ask the organiser to invite this email.
      </p>
      <div className="mt-5">
        <Button onClick={onSignOut}>Sign out</Button>
      </div>
    </Card>
  );
}

function UserMenu({
  name,
  role,
  onSignOut,
  detailed = false,
}: {
  name: string;
  role: string;
  onSignOut: () => void;
  /** Show the role under the name, as the organiser top bar does. */
  detailed?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setMenu((v) => !v)}
        className={
          "flex items-center gap-2 rounded-md text-sm hover:bg-muted " +
          (detailed ? "px-2 py-1" : "border border-border bg-background px-2 py-1.5")
        }
      >
        <span
          className={
            "grid place-items-center rounded-full font-semibold text-white " +
            (detailed ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs")
          }
          style={{ background: "var(--teal)" }}
        >
          {initials(name)}
        </span>
        {detailed ? (
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-[12rem] truncate font-semibold text-foreground">
              {name}
            </span>
            <span className="block text-xs text-muted-foreground">{role}</span>
          </span>
        ) : (
          <span className="hidden max-w-[12rem] truncate text-foreground md:inline">{name}</span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
      </button>
      {menu && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-popover py-1 shadow-md"
          onMouseLeave={() => setMenu(false)}
        >
          <div className="border-b border-border px-3 py-2">
            <div className="truncate text-sm font-medium text-foreground">{name}</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
          <Link
            to="/settings"
            onClick={() => setMenu(false)}
            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            Settings
          </Link>
          <button
            onClick={onSignOut}
            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Sidebar link in the organiser workspace. */
function SideLink({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors " +
        (active
          ? "border-[color:var(--teal)] bg-teal-soft"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground")
      }
      style={active ? { color: "var(--teal)" } : undefined}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {label}
    </Link>
  );
}

/** The selected hackathon, pinned to the foot of the organiser sidebar. */
function SidebarEventCard() {
  const { data: events = [] } = useEvents();
  const [event, setEvent] = useSelectedEvent(events);
  if (!event) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div
        className="grid h-8 w-8 place-items-center rounded-md"
        style={{ background: "var(--teal-soft)", color: "var(--teal)" }}
      >
        <Trophy className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="mt-3 line-clamp-2 text-sm font-bold text-foreground">{event.name}</div>
      <div className="mt-0.5 text-xs capitalize text-muted-foreground">{event.status}</div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {formatDate(event.starts_on)} - {formatDate(event.ends_on)}
      </div>
      {events.length > 1 && (
        <div className="mt-3 [&>select]:w-full">
          <HackathonPicker events={events} value={event.id} onChange={setEvent} />
        </div>
      )}
    </div>
  );
}

/** Organiser workspace: sidebar navigation, a search bar and the account menu. */
function OrganiserLayout({
  children,
  name,
  role,
  onSignOut,
}: {
  children: ReactNode;
  name: string;
  role: string;
  onSignOut: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const links = (close?: () => void) => (
    <>
      {adminNav.map((n) => (
        <SideLink
          key={n.to}
          to={n.to}
          label={n.label}
          icon={n.icon}
          active={pathname.startsWith(n.to)}
          onClick={close}
        />
      ))}
      <SideLink
        to="/settings"
        label="Settings"
        icon={Settings}
        active={pathname.startsWith("/settings")}
        onClick={close}
      />
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <BrandLink />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{links()}</nav>
        <div className="p-3">
          <SidebarEventCard />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="rounded-md border border-border p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="lg:hidden">
              <BrandLink />
            </div>
            <form
              className="relative hidden max-w-md flex-1 md:block"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/submissions", search: { q: query.trim() || undefined } });
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entries by project or team..."
                aria-label="Search entries"
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
              />
            </form>
            <div className="ml-auto">
              <UserMenu name={name} role={role} onSignOut={onSignOut} detailed />
            </div>
          </div>
          {open && (
            <div className="border-t border-border bg-background lg:hidden">
              <nav className="flex flex-col gap-1 p-2">
                {links(() => setOpen(false))}
                <button
                  onClick={onSignOut}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Sign out
                </button>
              </nav>
              <div className="p-2">
                <SidebarEventCard />
              </div>
            </div>
          )}
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, roles, isAdmin, isPlatformAdmin, isOrganiser, ready } = useAuth();
  const noAccess = ready && !!user && roles.length === 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const name = displayName(user);
  const nav = !ready ? [] : isAdmin ? adminNav : judgeNav;
  const role = isPlatformAdmin ? "Platform admin" : isAdmin ? "Organiser" : "Judge";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const body = noAccess ? <NoAccess email={user?.email} onSignOut={signOut} /> : children;

  // Organisers and the platform admin work from the sidebar workspace.
  if (ready && isAdmin && !noAccess) {
    return (
      // Organisers' workspaces use the organiser palette; the PLP platform admin keeps PLP colours.
      <div className={isOrganiser ? "theme-organiser" : undefined}>
        <OrganiserLayout name={name} role={role} onSignOut={signOut}>
          {body}
        </OrganiserLayout>
      </div>
    );
  }

  return (
    // Organisers' workspaces use the organiser palette; the PLP platform admin keeps PLP colours.
    <div
      className={"flex min-h-screen flex-col bg-surface" + (isOrganiser ? " theme-organiser" : "")}
    >
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
            <UserMenu name={name} role={role} onSignOut={signOut} />
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
      {ready && !noAccess && <HackathonBar />}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {body}
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
