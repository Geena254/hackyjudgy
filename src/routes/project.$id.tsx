import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Github, Presentation, PlayCircle } from "lucide-react";
import { Card, Pill } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";
import { usePublicSubmission, usePublicEvent, formatDate } from "@/lib/hackathon";

async function loadProjectMeta(id: string) {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/public_submission`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ _id: id }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ project_title?: string; summary?: string }>;
    const row = rows?.[0];
    if (!row?.project_title) return null;
    return { title: row.project_title, summary: row.summary ?? null };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/project/$id")({
  loader: async ({ params }) => ({ meta: await loadProjectMeta(params.id) }),
  head: ({ params, loaderData }) => {
    const name = loaderData?.meta?.title;
    const title = name
      ? `${name} — Hackathon project on GavelLab`
      : "Hackathon Project Showcase — GavelLab";
    const description = loaderData?.meta?.summary
      ? loaderData.meta.summary.slice(0, 155)
      : "A shareable page for a hackathon project: what it does, who built it, and links to the code, demo and pitch deck.";
    const canonical = `https://gavellab.lovable.app/project/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ProjectShowcase,
});

function LinkCard({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 rounded-md border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 truncate">{label}</span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

function ProjectShowcase() {
  const { id } = Route.useParams();
  const { data: project, isLoading } = usePublicSubmission(id);
  const { data: event } = usePublicEvent(project?.event_id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <PlpLogo className="h-10" />
          </Link>
          <Link
            to="/submit"
            className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Submit a project
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {isLoading && <Card className="p-8 text-sm text-muted-foreground">Loading project…</Card>}

        {!isLoading && !project && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-foreground">Project not available</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This project page is not public. It may belong to a hackathon that has closed.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-md px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Back to home
            </Link>
          </Card>
        )}

        {!isLoading && project && (
          <article>
            <div className="flex flex-wrap items-center gap-2">
              {project.category && <Pill tone="teal" variant="outline">{project.category}</Pill>}
              <span className="text-xs text-muted-foreground">
                Entered {formatDate(project.created_at.slice(0, 10))}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">{project.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.team_name ? `By ${project.team_name}` : "Independent entry"}
              {event ? ` · ${event.name}` : ""}
            </p>

            {project.description && (
              <Card className="mt-6 p-6">
                <h2 className="text-lg font-bold text-foreground">About this project</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              </Card>
            )}

            {(project.repo_url || project.demo_url || project.deck_url) && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {project.repo_url && (
                  <LinkCard href={project.repo_url} label="View the code" icon={Github} />
                )}
                {project.demo_url && (
                  <LinkCard href={project.demo_url} label="Watch the demo" icon={PlayCircle} />
                )}
                {project.deck_url && (
                  <LinkCard href={project.deck_url} label="Pitch deck" icon={Presentation} />
                )}
              </div>
            )}

            <Card className="mt-6 p-6">
              <h2 className="text-base font-bold text-foreground">Share this project</h2>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {typeof window !== "undefined" ? window.location.href : `/project/${project.id}`}
              </p>
            </Card>
          </article>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
