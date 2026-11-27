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
