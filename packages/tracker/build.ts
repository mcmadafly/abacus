/**
 * Bundle + minify the tracking snippet to apps/web/public/abacus.js so the
 * single Worker can serve it as a static asset.
 */
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outFile = resolve(import.meta.dir, "../../apps/web/public/abacus.js");
await mkdir(dirname(outFile), { recursive: true });

const result = await Bun.build({
  entrypoints: [resolve(import.meta.dir, "src/tracker.ts")],
  target: "browser",
  minify: true,
  format: "iife",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const [artifact] = result.outputs;
if (!artifact) {
  console.error("tracker build produced no output");
  process.exit(1);
}

const code = await artifact.text();
await Bun.write(outFile, code);
console.log(`✓ tracker built → ${outFile} (${(code.length / 1024).toFixed(2)} KB)`);
