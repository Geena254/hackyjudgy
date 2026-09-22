// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Vercel sets VERCEL=1 during its build. There we emit a Vercel serverless
// bundle; everywhere else (Lovable hosting) we keep the Cloudflare default.
const isVercel = !!process.env["VERCEL"];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
  vite: {
    plugins: [mcpPlugin()],
    // `cloudflare:workers` is only resolvable on the Cloudflare runtime. The MCP
    // library imports it dynamically inside a try/catch for optional metrics, so
    // leaving it external is safe on other hosts (Vercel/Node).
    build: {
      rollupOptions: { external: [/^cloudflare:/] },
    },
  },
});
