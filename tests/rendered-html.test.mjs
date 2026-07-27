import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  candidateTimes,
  filterAvailableTimes,
  occupiedSlots,
} from "../lib/booking-rules.ts";

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

test("offers 15-minute starts within 9 AM to 5 PM", () => {
  const manicureTimes = candidateTimes(60);
  assert.equal(manicureTimes[0], "09:00");
  assert.equal(manicureTimes.at(-1), "16:00");
  assert.ok(manicureTimes.includes("09:15"));
  assert.ok(manicureTimes.includes("09:30"));
  assert.ok(!manicureTimes.includes("16:30"));

  const artTimes = candidateTimes(30);
  assert.equal(artTimes.at(-1), "16:30");
});

test("blocks the full combined duration plus a 15-minute reset gap", () => {
  const combinedDuration = 60 + 75 + 30;
  const reserved = occupiedSlots("09:15", combinedDuration);

  assert.equal(reserved[0], "09:15");
  assert.equal(reserved.at(-1), "12:00");
  assert.equal(reserved.length, 12);
  assert.ok(!candidateTimes(combinedDuration).includes("14:30"));
  assert.ok(candidateTimes(combinedDuration).includes("14:15"));
});

test("removes every start time that would overlap a booking", () => {
  const reserved = occupiedSlots("10:00", 90);
  assert.deepEqual(reserved, ["10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30"]);

  const available = filterAvailableTimes(60, reserved);
  assert.ok(!available.includes("09:30"));
  assert.ok(!available.includes("10:00"));
  assert.ok(!available.includes("10:30"));
  assert.ok(!available.includes("11:00"));
  assert.ok(!available.includes("11:30"));
  assert.ok(available.includes("11:45"));
});
