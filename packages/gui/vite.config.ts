import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import type { IncomingMessage } from "http";

// If the browser is requesting a page (HTML navigation), don't proxy — let
// Vite serve index.html instead so React Router handles the route client-side.
function bypassHtmlRequests(req: IncomingMessage) {
  const accept = req.headers["accept"] ?? "";
  if (accept.includes("text/html")) return "/index.html";
  return null;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@get-down/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    proxy: {
      "/auth": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/gigs": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/enquir": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/services": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/people": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/songs": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/rehearsals": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/todos": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/expenses": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/payments": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/invoices": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/attributions": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/showcases": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/assigned-roles": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/calendar": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
      "/fee-allocations": { target: "http://localhost:3000", bypass: bypassHtmlRequests },
    },
  },
});
