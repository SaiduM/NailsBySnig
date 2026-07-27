import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const serverDirectory = resolve(root, "dist", "server");
const workerDirectory = resolve(root, "dist", "client", "_worker.js");
const generatedWranglerConfig = resolve(serverDirectory, "wrangler.json");

await rm(workerDirectory, { recursive: true, force: true });
await mkdir(workerDirectory, { recursive: true });
await cp(serverDirectory, workerDirectory, { recursive: true });
// Pages treats `_worker.js` as the Worker module bundle, so the server copy of
// the stylesheet is not a public asset and is unnecessary here.
await rm(resolve(workerDirectory, "assets"), { recursive: true, force: true });
await rename(
  resolve(workerDirectory, "index.js"),
  resolve(workerDirectory, "app.js"),
);
await writeFile(
  resolve(workerDirectory, "index.js"),
  `import app from "./app.js";

export default {
  async fetch(request, env, context) {
    if (request.method === "GET" || request.method === "HEAD") {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }
    return app.fetch(request, env, context);
  },
};
`,
);
await rm(resolve(workerDirectory, "wrangler.json"), { force: true });
await rm(generatedWranglerConfig, { force: true });
await rm(resolve(root, ".wrangler", "deploy", "config.json"), { force: true });

console.log("Prepared dist/client for Cloudflare Pages advanced mode.");
