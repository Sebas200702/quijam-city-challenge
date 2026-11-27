import { beforeEach, describe, expect, it, vi } from "vitest";

// The call ends at the auth error, before any session or table query.
const signInWithPassword = vi.fn(async (_credentials: unknown) => ({
	error: { message: "Invalid login credentials" },
}));

vi.mock("./supabase", () => ({ supabase: { auth: { signInWithPassword } } }));

const { signInCityOperator } = await import("./city-dashboard-service");

describe("city operator sign-in options", () => {
	beforeEach(() => signInWithPassword.mockClear());

	it("signs in without options when there is no token (previous behavior)", async () => {
		await expect(signInCityOperator("op@ciudad.co", "x")).rejects.toThrow();
		expect(signInWithPassword).toHaveBeenCalledWith({
			email: "op@ciudad.co",
			password: "x",
		});
	});

	it("sends the CAPTCHA token", async () => {
		await expect(
			signInCityOperator("op@ciudad.co", "x", "tok"),
		).rejects.toThrow();
		expect(signInWithPassword).toHaveBeenCalledWith({
			email: "op@ciudad.co",
			password: "x",
			options: { captchaToken: "tok" },
		});
	});
});
