import { describe, expect, it } from "vitest";
import { canDropPending, partitionPending } from "./pending-actions";

const call = (id: string) => ({ id });

describe("canDropPending", () => {
	it("keeps an action that is already running", () => {
		expect(canDropPending(true)).toBe(false);
	});

	it("lets a waiting action be cancelled or abandoned", () => {
		expect(canDropPending(false)).toBe(true);
	});
});

describe("partitionPending", () => {
	it("drops only the waiting actions and keeps the running one", () => {
		const running = new Set(["a"]);
		expect(partitionPending([call("a"), call("b")], running)).toEqual({
			kept: [call("a")],
			dropped: [call("b")],
		});
	});

	it("with ids, only those waiting actions are dropped", () => {
		expect(
			partitionPending([call("a"), call("b")], new Set(), ["b", "x"]),
		).toEqual({ kept: [call("a")], dropped: [call("b")] });
	});

	it("never drops a running action even when its id is withdrawn", () => {
		expect(partitionPending([call("a")], new Set(["a"]), ["a"])).toEqual({
			kept: [call("a")],
			dropped: [],
		});
	});
});
