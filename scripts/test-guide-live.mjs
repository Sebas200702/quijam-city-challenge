// End-to-end check of the Gemini Live Guide (issue #21) with a fake microphone.
// Needs: the app running (bun run dev, or build + node dist/server/entry.mjs) with
// GEMINI_API_KEY set on the server, Playwright with Chromium, espeak-ng and ffmpeg.
// Usage: node scripts/test-guide-live.mjs [base-url]
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

// require() so a globally installed Playwright (NODE_PATH) also works.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE_URL = process.argv[2] ?? "http://localhost:4321";
const QUESTION = "Hello! How do I get to the stadium from the Malecon?";
const results = [];

function report(name, ok, detail) {
	results.push({ name, ok });
	console.log(
		`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`,
	);
}

async function checkToken() {
	const response = await fetch(`${BASE_URL}/api/guide/token?mode=text`, {
		method: "POST",
	});
	const body = await response.json();
	const leaksKey =
		process.env.GEMINI_API_KEY &&
		JSON.stringify(body).includes(process.env.GEMINI_API_KEY);
	report(
		"token endpoint issues an ephemeral token",
		response.ok && typeof body.token === "string" && !leaksKey,
		response.ok
			? `model: ${body.model}`
			: `status ${response.status}: ${body.error}`,
	);
}

function makeQuestionWav() {
	const dir = mkdtempSync(join(tmpdir(), "guide-test-"));
	const raw = join(dir, "raw.wav");
	const wav = join(dir, "question.wav");
	execFileSync("espeak-ng", ["-v", "en-us", "-s", "150", "-w", raw, QUESTION]);
	// Mono 16 kHz with 5 s of trailing silence so voice activity detection ends the turn.
	execFileSync("ffmpeg", [
		"-loglevel",
		"error",
		"-y",
		"-i",
		raw,
		"-af",
		"apad=pad_dur=5",
		"-ar",
		"16000",
		"-ac",
		"1",
		wav,
	]);
	return wav;
}

async function logLines(page) {
	return page.locator('[data-testid="guide-log"] li').allTextContents();
}

async function waitForLine(page, prefix, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const lines = await logLines(page);
		if (
			lines.some(
				(line) => line.startsWith("Error") || line.startsWith("Sesión cerrada"),
			)
		)
			break;
		if (lines.some((line) => line.startsWith(prefix))) {
			await page.waitForTimeout(3000); // let the rest of the reply arrive
			return logLines(page);
		}
		await page.waitForTimeout(500);
	}
	return null;
}

async function checkText(browser) {
	const page = await browser.newPage();
	await page.goto(`${BASE_URL}/prueba-guia`);
	await page.selectOption("select", "text");
	await page.getByRole("button", { name: "Iniciar" }).click();
	await page
		.getByText("Conectado: escribe")
		.waitFor({ timeout: 15000 })
		.catch(() => {});
	await page.getByPlaceholder("How do I get to the stadium?").fill(QUESTION);
	await page.getByRole("button", { name: "Enviar" }).click();
	const lines = await waitForLine(page, "Guía:", 30000);
	report(
		"text mode answers (plan B)",
		lines !== null,
		(lines ?? (await logLines(page))).join(" | "),
	);
	await page.close();
}

async function checkVoice() {
	const wav = makeQuestionWav();
	const browser = await chromium.launch({
		args: [
			"--use-fake-ui-for-media-stream",
			"--use-fake-device-for-media-stream",
			`--use-file-for-fake-audio-capture=${wav}`,
			"--autoplay-policy=no-user-gesture-required",
		],
	});
	const context = await browser.newContext({ permissions: ["microphone"] });
	// Count seconds of Guide audio scheduled for playback.
	await context.addInitScript(() => {
		window.__guideAudioSeconds = 0;
		const start = AudioBufferSourceNode.prototype.start;
		AudioBufferSourceNode.prototype.start = function (...args) {
			window.__guideAudioSeconds += this.buffer?.duration ?? 0;
			return start.apply(this, args);
		};
	});
	const page = await context.newPage();
	await page.goto(`${BASE_URL}/prueba-guia`);
	await page.getByRole("button", { name: "Iniciar" }).click();
	const lines = await waitForLine(page, "Guía (voz):", 60000);
	const seconds = await page.evaluate(() => window.__guideAudioSeconds);
	const finalLines = lines ?? (await logLines(page));
	report(
		"voice: Gemini heard the question",
		finalLines.some((line) => line.startsWith("Tú (voz):")),
		finalLines.join(" | "),
	);
	report(
		"voice: Guide answered with audio",
		seconds > 0.5,
		`${seconds.toFixed(1)} s of audio received`,
	);
	await browser.close();
}

await checkToken();
const browser = await chromium.launch();
await checkText(browser);
await browser.close();
await checkVoice();

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
