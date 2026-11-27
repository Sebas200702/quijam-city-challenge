// Every server path that acts with the city role answers 403 mfa_required to a
// city session at aal1, lets it through at aal2, and keeps the previous answer
// for every other caller.

import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";

type User = { id: string; role: string; appRole?: string };

const state: { users: Map<string, User>; rpcRole: string | null } = {
	users: new Map(),
	rpcRole: null,
};

function fakeJwt(claims: Record<string, unknown>): string {
	const encode = (value: unknown) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

function tokenFor(user: User, aal: "aal1" | "aal2"): string {
	state.users.set(user.id, user);
	return fakeJwt({
		sub: user.id,
		aal,
		app_metadata: user.appRole ? { role: user.appRole } : {},
	});
}

function claimsOf(token: string): { sub: string } {
	return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
}

/**
 * A Supabase query: awaiting `select()` lists no rows; `eq().maybeSingle()`
 * answers `row(userId)`.
 */
function query(row: (userId?: string) => unknown) {
	return {
		select: () =>
			Object.assign(Promise.resolve({ data: [], error: null }), {
				eq: (_column: string, userId: string) => ({
					maybeSingle: async () => ({ data: row(userId), error: null }),
				}),
			}),
	};
}

function profileRow(table: string) {
	return (id?: string) => {
		const user = id ? state.users.get(id) : undefined;
		if (!user) return null;
		if (table === "user_profiles") return { role: user.role };
		if (table === "profiles")
			return {
				display_name: "Operador",
				is_verified_organizer: false,
				created_at: "2026-01-01T00:00:00Z",
			};
		return null;
	};
}

const admin = {
	auth: {
		getUser: async (token: string) => {
			const user = state.users.get(claimsOf(token).sub);
			return user
				? {
						data: {
							user: { id: user.id, app_metadata: { role: user.appRole } },
						},
						error: null,
					}
				: { data: { user: null }, error: new Error("bad token") };
		},
	},
	from: (table: string) => query(profileRow(table)),
};

vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: () => admin }));
vi.mock("./api-guard", () => ({ guardRequest: async () => null }));
vi.mock("../community/community-server", async (importOriginal) => ({
	...(await importOriginal<object>()),
	loadModerationQueue: async () => [],
}));
vi.mock("@supabase/supabase-js", async (importOriginal) => ({
	...(await importOriginal<object>()),
	createClient: () => ({
		rpc: async () => ({ data: state.rpcRole, error: null }),
		from: (table: string) => query(profileRow(table)),
	}),
}));

const city: User = { id: "city-1", role: "city" };
const visitor: User = { id: "visitor-1", role: "visitor" };

function context(token?: string, body?: unknown): APIContext {
	const headers = new Headers({ "content-type": "application/json" });
	if (token) headers.set("authorization", `Bearer ${token}`);
	return {
		request: new Request("http://localhost/api/test", {
			method: body === undefined ? "GET" : "POST",
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
		cookies: { get: () => undefined },
		clientAddress: "127.0.0.1",
	} as unknown as APIContext;
}

async function expectMfaRequired(response: Response) {
	expect(response.status).toBe(403);
	expect(await response.json()).toEqual({
		error:
			"Activa y verifica tu segundo factor para usar las funciones de la ciudad.",
		code: "mfa_required",
	});
}

beforeEach(() => {
	state.users.clear();
	state.rpcRole = null;
});

describe("moderation API", async () => {
	const { GET, POST } = await import("../../pages/api/community/moderation");

	it("answers mfa_required to a city session at aal1", async () => {
		await expectMfaRequired(await GET(context(tokenFor(city, "aal1"))));
		await expectMfaRequired(
			await POST(
				context(tokenFor(city, "aal1"), {
					kind: "event",
					id: "e1",
					action: "approve",
				}),
			),
		);
	});

	it("serves the queue to a city session at aal2", async () => {
		const response = await GET(context(tokenFor(city, "aal2")));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [] });
	});

	it("still refuses visitors with the previous message", async () => {
		const response = await GET(context(tokenFor(visitor, "aal1")));
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			error: "Solo el equipo de la ciudad puede moderar.",
		});
	});
});

describe("presenter API", async () => {
	const events = await import("../../pages/api/presentador/events");
	const session = await import("../../pages/api/presentador/session");

	it("answers mfa_required to a city session at aal1", async () => {
		await expectMfaRequired(
			await events.POST(context(tokenFor(city, "aal1"), {})),
		);
		const response = await session.GET(context(tokenFor(city, "aal1")));
		expect((await response.json()).access).toBeNull();
	});

	it("lets a city session at aal2 reach event validation", async () => {
		const response = await events.POST(context(tokenFor(city, "aal2"), {}));
		expect(response.status).toBe(400);
		const access = await session.GET(context(tokenFor(city, "aal2")));
		expect((await access.json()).access).toBe("city");
	});

	it("still answers 401 to a visitor", async () => {
		const response = await events.POST(context(tokenFor(visitor, "aal1"), {}));
		expect(response.status).toBe(401);
	});
});

describe("impact report API", async () => {
	const { POST } = await import("../../pages/api/city/impact-report");
	const { loadMetrics } = await import("../impact-report/impact-report-server");

	it("answers mfa_required to a city session at aal1", async () => {
		state.rpcRole = "city";
		await expectMfaRequired(await POST(context(tokenFor(city, "aal1"), {})));
	});

	it("answers mfa_required when the database already demotes aal1 city", async () => {
		state.rpcRole = "visitor";
		await expectMfaRequired(await POST(context(tokenFor(city, "aal1"), {})));
	});

	it("reads the metrics for a city session at aal2", async () => {
		state.rpcRole = "city";
		await expect(loadMetrics(tokenFor(city, "aal2"))).resolves.toBeTruthy();
	});

	it("still refuses visitors with the previous message", async () => {
		state.rpcRole = "visitor";
		const response = await POST(context(tokenFor(visitor, "aal1"), {}));
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			error: "Solo el rol ciudad puede generar el informe.",
		});
	});
});
