import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Download link from a results email: /report/<token>. The token is the only
// key; it is looked up server-side and the stored PDF is streamed back.

function notFound() {
  return new Response("This results link is not valid or has been removed.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const Route = createFileRoute("/report/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token ?? "";
        if (!/^[a-f0-9]{64}$/.test(token)) return notFound();

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await db
          .from("result_emails")
          .select("file_path, file_name")
          .eq("token", token)
          .maybeSingle();
        if (error) {
          console.error("[report] lookup failed", error.message);
          return new Response("Something went wrong. Please try again later.", { status: 500 });
        }
        if (!row) return notFound();

        const { data: file, error: fileError } = await db.storage
          .from("result-reports")
          .download(row.file_path);
        if (fileError || !file) return notFound();

        const ascii = row.file_name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
        return new Response(await file.arrayBuffer(), {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
            "cache-control": "private, no-store",
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});
