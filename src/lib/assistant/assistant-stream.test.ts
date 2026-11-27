import { describe, expect, it, vi } from "vitest";
import { answer } from "./assistant-server";
import {
	ASSISTANT_STREAM_TYPE,
	chunkText,
	createAnswerStream,
	encodeEvent,
	readAssistantStream,
} from "./assistant-stream";
import type {
	AssistantContext,
	AssistantRequest,
	AssistantResponse,
	AssistantStreamEvent,
} from "./assistant-types";

const context: AssistantContext = {
	now: "2026-11-26T15:00:00.000Z",
	signedIn: true,
	displayName: "Ana",
	isVisitor: false,
	fromPath: null,
};

const request = (
	text: string,
	overrides: Partial<AssistantContext> = {},
): AssistantRequest => ({
	messages: [{ role: "user", text }],
	context: { ...context, ...overrides },
});

const gemini = { apiKey: "test", model: "test-model" };

const response: AssistantResponse = {
	agent: "agenda",
	routedBy: "keywords",
	text: "Hay tres planes.",
	toolCalls: [],
	source: "local",
	suggestions: [],
};

/** Splits the bytes at every position given, to mimic network chunks. */
function bodyOf(text: string, cuts: number[] = []): ReadableStream<Uint8Array> {
	const bytes = new TextEncoder().encode(text);
	const points = [0, ...cuts, bytes.length];
	return new ReadableStream({
		start(controller) {
			for (let i = 0; i < points.length - 1; i++) {
				controller.enqueue(bytes.slice(points[i], points[i + 1]));
			}
			controller.close();
		},
	});
}

async function eventsOf(
	stream: ReadableStream<Uint8Array>,
): Promise<AssistantStreamEvent[]> {
	const text = await new Response(stream).text();
	return text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line) as AssistantStreamEvent);
}

const textOf = (events: AssistantStreamEvent[]) =>
	events
		.filter((event) => event.type === "text")
		.map((event) => (event.type === "text" ? event.text : ""))
		.join("");

describe("chunkText", () => {
	it("splits into small pieces that join back to the exact text", () => {
		const text = "¡Qué buena! Llena el formulario  con el nombre.\nListo.";
		const chunks = chunkText(text);
		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.join("")).toBe(text);
	});

	it("returns nothing for empty text", () => {
		expect(chunkText("")).toEqual([]);
	});
});

describe("readAssistantStream", () => {
	const lines = [
		encodeEvent({ type: "start", agent: "agenda", routedBy: "keywords" }),
		encodeEvent({ type: "text", text: "Hay " }),
		encodeEvent({ type: "text", text: "tres planes." }),
		encodeEvent({ type: "done", response }),
	].join("");

	it("reports start and every text piece, and returns the final response", async () => {
		const onStart = vi.fn();
		const pieces: string[] = [];
		const result = await readAssistantStream(bodyOf(lines, [3, 40, 41, 77]), {
			onStart,
			onText: (text) => pieces.push(text),
		});
		expect(onStart).toHaveBeenCalledWith("agenda");
		expect(pieces).toEqual(["Hay ", "tres planes."]);
		expect(result).toEqual(response);
	});

	it("throws on an error event", async () => {
		const body = encodeEvent({ type: "error", error: "boom" });
		await expect(readAssistantStream(bodyOf(body), {})).rejects.toThrow("boom");
	});

	it("throws when the stream ends without a final response", async () => {
		const body = encodeEvent({ type: "text", text: "Hola" });
		await expect(readAssistantStream(bodyOf(body), {})).rejects.toThrow();
	});
});

describe("createAnswerStream", () => {
	it("streams a local answer in pieces and ends with the same response", async () => {
		const stream = createAnswerStream(
			(hooks) =>
				answer(
					request("¿Qué planes hay este fin de semana?"),
					{
						openJev: null,
						gemini: null,
					},
					hooks,
				),
			{ chunkDelayMs: 0 },
		);
		const events = await eventsOf(stream);
		expect(events[0]).toEqual({
			type: "start",
			agent: "agenda",
			routedBy: "keywords",
		});
		const done = events.at(-1);
		expect(done?.type).toBe("done");
		if (done?.type !== "done") return;
		expect(
			events.filter((event) => event.type === "text").length,
		).toBeGreaterThan(1);
		expect(textOf(events)).toBe(done.response.text);
	});

	it("forwards Gemini text as it arrives for a signed-in person", async () => {
		const runGemini = vi.fn(
			async (
				_agent: unknown,
				_messages: unknown,
				_context: unknown,
				_options: unknown,
				onText?: (text: string) => void,
			) => {
				onText?.("Te busco ");
				onText?.("planes.");
				return { text: "Te busco planes.", toolCalls: [] };
			},
		);
		const stream = createAnswerStream(
			(hooks) =>
				answer(
					request("planes hoy"),
					{ openJev: null, gemini, runGemini },
					hooks,
				),
			{ chunkDelayMs: 0 },
		);
		const events = await eventsOf(stream);
		expect(
			events
				.filter((event) => event.type === "text")
				.map((event) => (event.type === "text" ? event.text : "")),
		).toEqual(["Te busco ", "planes."]);
		const done = events.at(-1);
		expect(done?.type === "done" && done.response.source).toBe("gemini");
	});

	it("does not stream Gemini text live for a signed-out person", async () => {
		const runGemini = vi.fn(async () => ({
			text: "Te inscribo.",
			toolCalls: [],
		}));
		await eventsOf(
			createAnswerStream(
				(hooks) =>
					answer(
						request("planes hoy", { signedIn: false, displayName: null }),
						{ openJev: null, gemini, runGemini },
						hooks,
					),
				{ chunkDelayMs: 0 },
			),
		);
		expect(runGemini.mock.calls[0]).toHaveLength(4);
	});

	it("ends with an error event when the answer fails", async () => {
		const events = await eventsOf(
			createAnswerStream(
				async () => {
					throw new Error("boom");
				},
				{ chunkDelayMs: 0 },
			),
		);
		expect(events).toEqual([
			{ type: "error", error: "The assistant could not answer." },
		]);
	});

	it("uses the NDJSON media type", () => {
		expect(ASSISTANT_STREAM_TYPE).toBe("application/x-ndjson");
	});
});
