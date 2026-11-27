import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signUp } from "./vendor-service";

function fakeClient() {
	const auth = {
		signInWithPassword: vi.fn(async (_credentials: unknown) => ({
			data: {},
			error: null,
		})),
		signUp: vi.fn(async (_credentials: unknown) => ({
			data: { session: null },
			error: null,
		})),
	};
	return { auth, client: { auth } as unknown as SupabaseClient };
}

describe("vendor auth options", () => {
	beforeEach(() => {
		vi.stubGlobal("window", { location: { origin: "https://quillart.dev" } });
	});
	afterEach(() => vi.unstubAllGlobals());

	it("signs in without options when there is no token (previous behavior)", async () => {
		const { auth, client } = fakeClient();
		await signIn(client, " v@example.com ", "secreta123");
		expect(auth.signInWithPassword).toHaveBeenCalledWith({
			email: "v@example.com",
			password: "secreta123",
		});
	});

	it("sends the CAPTCHA token on sign in", async () => {
		const { auth, client } = fakeClient();
		await signIn(client, "v@example.com", "secreta123", "tok");
		expect(auth.signInWithPassword).toHaveBeenCalledWith({
			email: "v@example.com",
			password: "secreta123",
			options: { captchaToken: "tok" },
		});
	});

	it("signs up as before without a token", async () => {
		const { auth, client } = fakeClient();
		await signUp(client, "v@example.com", "secreta123", " Rosa ");
		expect(auth.signUp).toHaveBeenCalledWith({
			email: "v@example.com",
			password: "secreta123",
			options: {
				data: { display_name: "Rosa", is_visitor: false },
				emailRedirectTo: "https://quillart.dev/vendedor/entrar",
			},
		});
	});

	it("sends the CAPTCHA token on sign up", async () => {
		const { auth, client } = fakeClient();
		await signUp(client, "v@example.com", "secreta123", "Rosa", "tok");
		expect(auth.signUp.mock.calls[0][0]).toMatchObject({
			options: {
				emailRedirectTo: "https://quillart.dev/vendedor/entrar",
				captchaToken: "tok",
			},
		});
	});
});
