import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const serverDirectory = resolve(root, "dist", "server");
const workerDirectory = resolve(root, "dist", "client", "_worker.js");
const generatedWranglerConfig = resolve(serverDirectory, "wrangler.json");

await rm(workerDirectory, { recursive: true, force: true });
await mkdir(workerDirectory, { recursive: true });
await cp(serverDirectory, workerDirectory, { recursive: true });
await rm(resolve(workerDirectory, "wrangler.json"), { force: true });
await rm(generatedWranglerConfig, { force: true });
await rm(resolve(root, ".wrangler", "deploy", "config.json"), { force: true });

console.log("Prepared dist/client for Cloudflare Pages advanced mode.");
