import { describe, expect, it } from "vitest";
import {
	CommunityError,
	parseModerationRequest,
	parsePublishRequest,
	sortQueue,
} from "./community-server";
import type { ModerationQueueItem } from "./community-types";

describe("parsePublishRequest", () => {
	it("accepts a reply and trims it", () => {
		expect(
			parsePublishRequest({ kind: "post", threadId: "t1", body: "  Hola  " }),
		).toEqual({ kind: "post", threadId: "t1", body: "Hola" });
	});

	it("rejects unknown kinds and invalid content with a 400", () => {
		expect(() => parsePublishRequest({ kind: "dm", input: {} })).toThrow(
			CommunityError,
		);
		try {
			parsePublishRequest({
				kind: "thread",
				input: { title: "Hi", body: "", category: "general" },
			});
		} catch (error) {
			expect((error as CommunityError).status).toBe(400);
		}
	});
});

describe("parseModerationRequest", () => {
	it("only accepts the three actions", () => {
		expect(
			parseModerationRequest({ kind: "post", id: "p1", action: "approve" }),
		).toEqual({ kind: "post", id: "p1", action: "approve" });
		expect(() =>
			parseModerationRequest({ kind: "post", id: "p1", action: "delete" }),
		).toThrow(CommunityError);
	});
});

describe("sortQueue", () => {
	const item = (
		id: string,
		priority: ModerationQueueItem["priority"],
		createdAt: string,
	): ModerationQueueItem => ({
		kind: "post",
		id,
		title: "",
		body: "",
		authorName: "",
		createdAt,
		status: "held",
		labels: [],
		source: "rules",
		priority,
		threadId: null,
	});

	it("puts emergencies first, then city reports, newest first", () => {
		const sorted = sortQueue([
			item("old-none", "none", "2026-11-27T10:00:00Z"),
			item("city", "city_attention", "2026-11-27T09:00:00Z"),
			item("new-none", "none", "2026-11-27T11:00:00Z"),
			item("sos", "emergency", "2026-11-27T08:00:00Z"),
		]);
		expect(sorted.map((entry) => entry.id)).toEqual([
			"sos",
			"city",
			"new-none",
			"old-none",
		]);
	});
});
