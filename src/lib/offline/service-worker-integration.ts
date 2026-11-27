// Builds /sw.js after `astro build`: lists the client build files to save
// for offline use, derives the version from that list (a new build means new
// file hashes, so a new worker) and bundles src/lib/offline/service-worker.ts
// as one classic script, which every browser accepts as a service worker.

import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { build } from "vite";
import { precacheUrls } from "./offline-cache";

const ENTRY = fileURLToPath(new URL("./service-worker.ts", import.meta.url));

export function serviceWorker(): AstroIntegration {
	return {
		name: "quillart-service-worker",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const outDir = fileURLToPath(dir);
				const files = await readdir(outDir, {
					recursive: true,
					withFileTypes: true,
				});
				const urls = precacheUrls(
					files
						.filter((entry) => entry.isFile())
						.map((entry) =>
							relative(outDir, join(entry.parentPath, entry.name)),
						),
				);
				const version = createHash("sha256")
					.update(urls.join("\n"))
					.digest("hex")
					.slice(0, 12);
				await build({
					configFile: false,
					logLevel: "warn",
					define: {
						__SW_VERSION__: JSON.stringify(version),
						__PRECACHE__: JSON.stringify(urls),
					},
					build: {
						outDir,
						emptyOutDir: false,
						copyPublicDir: false,
						minify: true,
						target: "es2020",
						lib: {
							entry: ENTRY,
							formats: ["iife"],
							name: "quillartServiceWorker",
							fileName: () => "sw.js",
						},
					},
				});
				logger.info(
					`sw.js ${version}: ${urls.length} files saved for offline use`,
				);
			},
		},
	};
}
