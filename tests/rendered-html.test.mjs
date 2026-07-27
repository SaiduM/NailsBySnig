import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("defines an installable NailsBySnig web app", async () => {
  const [manifestText, layout, controller] = await Promise.all([
    source("public/manifest.webmanifest"),
    source("app/layout.tsx"),
    source("app/PWAController.tsx"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.name, "NailsBySnig");
  assert.equal(manifest.short_name, "NailsBySnig");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#E75E2E");
  assert.deepEqual(
    manifest.icons.map(({ sizes, type }) => ({ sizes, type })),
    [
      { sizes: "192x192", type: "image/png" },
      { sizes: "512x512", type: "image/png" },
    ],
  );

  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(layout, /appleWebApp:/);
  assert.match(layout, /<PWAController \/>/);
  assert.match(controller, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(controller, /beforeinstallprompt/);
  assert.match(controller, /Add to Home Screen/);
});

test("ships usable app icons and a safe offline shell", async () => {
  const [icon192, icon512, serviceWorker, page] = await Promise.all([
    stat(new URL("public/app-icon-192.png", root)),
    stat(new URL("public/app-icon-512.png", root)),
    source("public/sw.js"),
    source("app/page.tsx"),
  ]);

  assert.ok(icon192.size > 1_000);
  assert.ok(icon512.size > 5_000);
  assert.match(serviceWorker, /nails-by-snig-v1/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(serviceWorker, /caches\.put\([^)]*\/api\//);
  assert.match(page, /NailsBySnig/);
});
