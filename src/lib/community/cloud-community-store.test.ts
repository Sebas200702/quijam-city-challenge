import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCloudCommunityStore } from "./cloud-community-store";

// Only the auth calls these tests reach; both end before any table query.
function fakeClient() {
	const signUp = vi.fn(async (_credentials: unknown) => ({
		data: { session: null, user: null },
		error: null,
	}));
	const signInWithPassword = vi.fn(async (_credentials: unknown) => ({
		data: { user: null, session: null },
		error: { message: "Invalid login credentials" },
	}));
	const client = { auth: { signUp, signInWithPassword } };
	return {
		signUp,
		signInWithPassword,
		store: createCloudCommunityStore(client as unknown as SupabaseClient),
	};
}

const input = {
	email: " ana@example.com ",
	password: "secreta123",
	displayName: "Ana",
	neighborhood: null,
	isVisitor: false,
};

describe("cloud store auth options", () => {
	beforeEach(() => {
		vi.stubGlobal("window", { location: { origin: "https://quillart.dev" } });
	});
	afterEach(() => vi.unstubAllGlobals());

	it("signs up without captchaToken when there is no token (previous behavior)", async () => {
		const { store, signUp } = fakeClient();
		await store.signUp(input);
		expect(signUp).toHaveBeenCalledWith({
			email: "ana@example.com",
			password: "secreta123",
			options: {
				data: { display_name: "Ana", neighborhood: null, is_visitor: false },
				emailRedirectTo: "https://quillart.dev/perfil",
			},
		});
	});

	it("sends the CAPTCHA token on sign up", async () => {
		const { store, signUp } = fakeClient();
		await store.signUp({ ...input, captchaToken: "tok" });
		expect(signUp.mock.calls[0][0]).toMatchObject({
			options: {
				emailRedirectTo: "https://quillart.dev/perfil",
				captchaToken: "tok",
			},
		});
	});

	it("signs in without options when there is no token (previous behavior)", async () => {
		const { store, signInWithPassword } = fakeClient();
		await expect(store.signIn("ana@example.com", "x")).rejects.toThrow();
		expect(signInWithPassword).toHaveBeenCalledWith({
			email: "ana@example.com",
			password: "x",
		});
	});

	it("sends the CAPTCHA token on sign in", async () => {
		const { store, signInWithPassword } = fakeClient();
		await expect(store.signIn("ana@example.com", "x", "tok")).rejects.toThrow();
		expect(signInWithPassword).toHaveBeenCalledWith({
			email: "ana@example.com",
			password: "x",
			options: { captchaToken: "tok" },
		});
	});
});

// Lookups by id run from().select().eq().neq().maybeSingle().
function lookupStore(error: { code: string; message: string }) {
	const chain = {
		select: () => chain,
		eq: () => chain,
		neq: () => chain,
		maybeSingle: async () => ({ data: null, error }),
	};
	return createCloudCommunityStore({
		from: () => chain,
	} as unknown as SupabaseClient);
}

describe("cloud store lookups by id", () => {
	const malformed = {
		code: "22P02",
		message: 'invalid input syntax for type uuid: "no-existe-123"',
	};

	it("treats a malformed event id as not found", async () => {
		await expect(
			lookupStore(malformed).getEvent("no-existe-123"),
		).resolves.toBeNull();
	});

	it("treats a malformed thread id as not found", async () => {
		await expect(
			lookupStore(malformed).getThread("no-existe-123"),
		).resolves.toBeNull();
	});

	it("still surfaces other lookup errors", async () => {
		const store = lookupStore({ code: "XX000", message: "boom" });
		await expect(store.getEvent("x")).rejects.toThrow("boom");
		await expect(store.getThread("x")).rejects.toThrow("boom");
	});
});
