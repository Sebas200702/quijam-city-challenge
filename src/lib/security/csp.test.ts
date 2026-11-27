import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	buildCsp,
	cspHeaderName,
	inlineScriptHashes,
	parseCspMode,
	supabaseOrigins,
} from "./csp";

const sha = (text: string) =>
	`'sha256-${createHash("sha256").update(text).digest("base64")}'`;

function directive(policy: string, name: string): string[] {
	const found = policy.split("; ").find((part) => part.startsWith(`${name} `));
	return found ? found.split(" ").slice(1) : [];
}

describe("inlineScriptHashes", () => {
	it("hashes inline scripts exactly as written, skipping external and JSON ones", async () => {
		const theme = "\n\ttry { localStorage.getItem('x') } catch {}\n";
		const html = `<head><script>${theme}</script><script type="module" src="/_astro/a.js"></script>
			<script type="application/json">{"a":1}</script></head><body><script type="module">import "x";</script></body>`;
		expect(await inlineScriptHashes(html)).toEqual([
			sha(theme),
			sha('import "x";'),
		]);
	});

	it("returns each hash once", async () => {
		expect(
			await inlineScriptHashes("<script>a()</script><script>a()</script>"),
		).toHaveLength(1);
	});
});

describe("buildCsp", () => {
	const base = { scriptHashes: ["'sha256-abc'"], pathname: "/mapa" };

	it("allows only our scripts and the page's inline hashes", () => {
		expect(directive(buildCsp(base), "script-src")).toEqual([
			"'self'",
			"'sha256-abc'",
		]);
	});

	it("allows tiles, fonts, Supabase (https and wss) and Gemini Live", () => {
		const policy = buildCsp({
			...base,
			supabaseUrl: "https://abc.supabase.co",
		});
		expect(directive(policy, "img-src")).toContain(
			"https://tile.openstreetmap.org",
		);
		expect(directive(policy, "style-src")).toContain(
			"https://fonts.googleapis.com",
		);
		expect(directive(policy, "font-src")).toContain(
			"https://fonts.gstatic.com",
		);
		expect(directive(policy, "connect-src")).toEqual([
			"'self'",
			"https://abc.supabase.co",
			"wss://abc.supabase.co",
			"https://generativelanguage.googleapis.com",
			"wss://generativelanguage.googleapis.com",
		]);
	});

	it("blocks plugins, foreign framing and form posts to other sites", () => {
		const policy = buildCsp(base);
		expect(directive(policy, "object-src")).toEqual(["'none'"]);
		expect(directive(policy, "frame-ancestors")).toEqual(["'self'"]);
		expect(directive(policy, "form-action")).toEqual(["'self'"]);
		expect(directive(policy, "report-uri")).toEqual(["/api/csp-report"]);
	});

	it("allows blob scripts only on the voice test page, for its AudioWorklet", () => {
		expect(directive(buildCsp(base), "script-src")).not.toContain("blob:");
		expect(
			directive(buildCsp({ ...base, pathname: "/prueba-guia" }), "script-src"),
		).toContain("blob:");
	});

	it("allows Cloudflare Turnstile (script and frame) only on the profile page", () => {
		const turnstile = "https://challenges.cloudflare.com";
		const elsewhere = buildCsp(base);
		expect(directive(elsewhere, "script-src")).not.toContain(turnstile);
		expect(directive(elsewhere, "frame-src")).toEqual(["'self'"]);
		const profile = buildCsp({ ...base, pathname: "/perfil" });
		expect(directive(profile, "script-src")).toContain(turnstile);
		expect(directive(profile, "frame-src")).toEqual(["'self'", turnstile]);
		const withSlash = buildCsp({ ...base, pathname: "/perfil/" });
		expect(directive(withSlash, "frame-src")).toContain(turnstile);
	});
});

describe("settings", () => {
	it("enforces by default and accepts report-only or off", () => {
		expect(parseCspMode(undefined)).toBe("enforce");
		expect(parseCspMode("whatever")).toBe("enforce");
		expect(parseCspMode(" Report-Only ")).toBe("report-only");
		expect(parseCspMode("off")).toBe("off");
		expect(cspHeaderName("report-only")).toBe(
			"Content-Security-Policy-Report-Only",
		);
		expect(cspHeaderName("enforce")).toBe("Content-Security-Policy");
	});

	it("ignores a missing or broken Supabase URL", () => {
		expect(supabaseOrigins(undefined)).toEqual([]);
		expect(supabaseOrigins("not a url")).toEqual([]);
	});
});
