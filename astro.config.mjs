// @ts-check
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { serviceWorker } from "./src/lib/offline/service-worker-integration";

// https://astro.build/config
export default defineConfig({
	output: "server",
	// serviceWorker() writes /sw.js after `astro build` only (#47).
	integrations: [react(), serviceWorker()],
	vite: {
		plugins: [tailwindcss()],
	},
	adapter: node({
		mode: "standalone",
	}),
});
