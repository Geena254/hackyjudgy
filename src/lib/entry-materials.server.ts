// What AI grading reads from an entry's links, fetched on the server: the GitHub
// repository (README and file list) and the pitch deck (slide text). Videos and
// live demos are not opened. Everything here is the team's own material, so the
// grading prompt treats it as evidence, never as instructions.

const TIMEOUT_MS = 12_000;
const MAX_README_CHARS = 15_000;
const MAX_DECK_CHARS = 15_000;
const MAX_FILES = 300;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export type EntryMaterials = {
  /** Prompt text for each source that could be read. */
  sections: { label: string; body: string }[];
  /** Short labels for the organiser, e.g. "GitHub README", "Pitch deck (Canva)". */
  read: string[];
  /** Links that could not be read, with the reason. */
  unread: string[];
};

function clip(text: string, max: number) {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}\n[... cut off after ${max} characters]` : t;
}

async function get(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: { "User-Agent": UA, "Accept-Language": "en", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/* --------------------------------- GitHub --------------------------------- */

function githubRepo(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const [owner, repo] = u.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function readGithub(url: string, out: EntryMaterials) {
  const repo = githubRepo(url);
  if (!repo) return;
  const { owner, repo: name } = repo;
  const token = process.env["GITHUB_TOKEN"];
  const api = (path: string) =>
    get(`https://api.github.com/repos/${owner}/${name}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  // README: raw.githubusercontent.com has no API rate limit, so try it first.
  let readme: string | null = null;
  for (const file of ["README.md", "readme.md", "Readme.md", "README.MD", "README"]) {
    const res = await get(`https://raw.githubusercontent.com/${owner}/${name}/HEAD/${file}`).catch(
      () => null,
    );
    if (res?.ok) {
      readme = await res.text();
      break;
    }
  }
  if (readme === null) {
    const res = await api("/readme").catch(() => null);
    if (res?.ok) {
      const body = (await res.json()) as { content?: string; encoding?: string };
      if (body.content && body.encoding === "base64")
        readme = Buffer.from(body.content, "base64").toString("utf8");
    }
  }

  // File list (GitHub API: 60 requests an hour without GITHUB_TOKEN, 5,000 with one).
  let files: string[] | null = null;
  let filesNote = "";
  const tree = await api("/git/trees/HEAD?recursive=1").catch(() => null);
  if (tree?.ok) {
    const body = (await tree.json()) as {
      tree?: { path: string; type: string }[];
      truncated?: boolean;
    };
    files = (body.tree ?? [])
      .filter((t) => t.type === "blob" && !/(^|\/)(node_modules|\.git|dist|build)\//.test(t.path))
      .map((t) => t.path);
    if (files.length > MAX_FILES || body.truncated)
      filesNote = `\n[... ${files.length} files in total, first ${MAX_FILES} shown]`;
  } else if (tree?.status === 404 && readme === null) {
    out.unread.push("GitHub repository (not found or private)");
    return;
  } else if (tree && (tree.status === 403 || tree.status === 429)) {
    filesNote = "(file list unavailable: GitHub rate limit)";
  }

  if (readme === null && files === null) {
    out.unread.push("GitHub repository (could not be read)");
    return;
  }
  const parts = [`Repository: github.com/${owner}/${name}`];
  if (files) parts.push(`Files:\n${files.slice(0, MAX_FILES).join("\n")}${filesNote}`);
  else if (filesNote) parts.push(filesNote);
  parts.push(
    readme ? `README:\n${clip(readme, MAX_README_CHARS)}` : "README: (none in the repository)",
  );
  out.sections.push({ label: "GitHub repository", body: parts.join("\n\n") });
  out.read.push(readme ? "GitHub README" : "GitHub (no README)");
  if (files) out.read.push(`${files.length} repo files`);
}

/* ------------------------------- Pitch decks ------------------------------ */

/** The public view page of a Canva design, following canva.link short links. */
async function canvaViewUrl(url: string) {
  let u = new URL(url);
  if (u.hostname === "canva.link") {
    const res = await get(url, { redirect: "manual" });
    const next = res.headers.get("location");
    if (!next) return null;
    u = new URL(next, url);
  }
  const m = u.pathname.match(/^\/design\/([^/]+)\/([^/]+)/);
  return m ? `https://www.canva.com/design/${m[1]}/${m[2]}/view` : null;
}

/**
 * Slide text from a Canva view page. The design is embedded in the page as
 * JSON, with each text box's runs under "a":{"C":{"A":[...]}} and line breaks
 * kept as a literal "\n".
 */
function canvaText(html: string) {
  const runs: string[] = [];
  const re = /"a":\{"C":\{"A":\[((?:"(?:[^"\\]|\\.)*",?)*)\]/g;
  for (const m of html.matchAll(re)) {
    try {
      const parts = JSON.parse(`[${m[1]}]`) as string[];
      const text = parts
        .join("")
        .replace(/\\n/g, "\n")
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\(["\\/])/g, "$1")
        .replace(/[ \t]+\n/g, "\n")
        .trim();
      if (text) runs.push(text);
    } catch {
      // Skip a text box we can't decode rather than failing the whole deck.
    }
  }
  return runs.join("\n");
}

function googleExportUrl(url: string) {
  const u = new URL(url);
  const id = u.pathname.match(/\/d\/([^/]+)/)?.[1];
  if (!id) return null;
  if (u.hostname === "docs.google.com" && u.pathname.startsWith("/presentation/"))
    return `https://docs.google.com/presentation/d/${id}/export/txt`;
  if (u.hostname === "docs.google.com" && u.pathname.startsWith("/document/"))
    return `https://docs.google.com/document/d/${id}/export?format=txt`;
  return null;
}

async function readDeck(url: string, out: EntryMaterials) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }

  if (host === "canva.link" || host.endsWith("canva.com")) {
    const view = await canvaViewUrl(url).catch(() => null);
    if (!view) {
      out.unread.push("Pitch deck (Canva link could not be opened)");
      return;
    }
    const res = await get(view).catch(() => null);
    if (!res?.ok) {
      out.unread.push(
        `Pitch deck (Canva returned ${res?.status ?? "no response"}; it may not be shared publicly)`,
      );
      return;
    }
    const html = await res.text();
    const title = html
      .match(/<meta property="og:title" content="([^"]*)"/)?.[1]
      ?.replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    const text = canvaText(html);
    if (!text) {
      out.unread.push("Pitch deck (Canva, no readable text)");
      return;
    }
    out.sections.push({
      label: "Pitch deck",
      body: `${title ? `Title: ${title}\n\n` : ""}Slide text, in order:\n${clip(text, MAX_DECK_CHARS)}`,
    });
    out.read.push("Pitch deck (Canva)");
    return;
  }

  const exportUrl = googleExportUrl(url);
  if (exportUrl) {
    const res = await get(exportUrl).catch(() => null);
    const type = res?.headers.get("content-type") ?? "";
    if (!res?.ok || !type.startsWith("text/plain")) {
      out.unread.push("Pitch deck (Google file is not shared publicly)");
      return;
    }
    out.sections.push({
      label: "Pitch deck",
      body: `Slide text:\n${clip(await res.text(), MAX_DECK_CHARS)}`,
    });
    out.read.push("Pitch deck (Google)");
    return;
  }

  out.unread.push("Pitch deck (this kind of link isn't read)");
}

/** Read what we can from an entry's GitHub and deck links. Never throws. */
export async function readEntryMaterials(sub: {
  repo_url: string | null;
  deck_url: string | null;
}) {
  const out: EntryMaterials = { sections: [], read: [], unread: [] };
  await Promise.all([
    sub.repo_url
      ? readGithub(sub.repo_url, out).catch(() => out.unread.push("GitHub repository (error)"))
      : null,
    sub.deck_url
      ? readDeck(sub.deck_url, out).catch(() => out.unread.push("Pitch deck (error)"))
      : null,
  ]);
  return out;
}
