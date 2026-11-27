import type { SupabaseClient } from "@supabase/supabase-js";
import { withCaptcha } from "../auth/captcha";
import { startOfTodayBogota } from "./vendor-logic";
import type {
	ProductInput,
	VendorBusiness,
	VendorProduct,
} from "./vendor-types";

const BUSINESS_COLUMNS =
	"id, code, name, category, zone, is_open, is_verified, verification_status";
const PRODUCT_COLUMNS = "id, name, price_cop, is_available, sort_order";

/** The browser Supabase client, or null when the app runs without Supabase. */
export async function vendorClient(): Promise<SupabaseClient | null> {
	try {
		return (await import("../supabase")).supabase;
	} catch {
		return null;
	}
}

function friendly(error: { message?: string } | null, fallback: string): Error {
	const raw = error?.message ?? "";
	if (/invalid login|invalid credentials/i.test(raw))
		return new Error("El correo o la contraseña no coinciden.");
	if (/already registered|already exists/i.test(raw))
		return new Error(
			"Ya hay una cuenta con ese correo. Entra con tu contraseña.",
		);
	if (/not valid or was already used/i.test(raw))
		return new Error(
			"Este código no es válido o ya se usó. Pide uno nuevo a la ciudad.",
		);
	if (/reserved|reservado/i.test(raw))
		return new Error(
			"Ese nombre está reservado. Usa tu nombre o el de tu negocio.",
		);
	return new Error(raw ? `${fallback} (${raw})` : fallback);
}

export async function currentUserId(
	client: SupabaseClient,
): Promise<string | null> {
	const { data } = await client.auth.getSession();
	return data.session?.user.id ?? null;
}

export async function signIn(
	client: SupabaseClient,
	email: string,
	password: string,
	captchaToken?: string | null,
): Promise<void> {
	const options = withCaptcha(undefined, captchaToken);
	const { error } = await client.auth.signInWithPassword({
		email: email.trim(),
		password,
		...(options ? { options } : {}),
	});
	if (error) throw friendly(error, "No pudimos entrar.");
}

/** Returns false when Supabase asks to confirm the email first. */
export async function signUp(
	client: SupabaseClient,
	email: string,
	password: string,
	displayName: string,
	captchaToken?: string | null,
): Promise<boolean> {
	const { data, error } = await client.auth.signUp({
		email: email.trim(),
		password,
		options: withCaptcha(
			{
				data: { display_name: displayName.trim(), is_visitor: false },
				emailRedirectTo: `${window.location.origin}/vendedor/entrar`,
			},
			captchaToken,
		),
	});
	if (error) throw friendly(error, "No pudimos crear la cuenta.");
	return Boolean(data.session);
}

export async function claimBusiness(
	client: SupabaseClient,
	code: string,
): Promise<string> {
	const { data, error } = await client.rpc("claim_business", { token: code });
	if (error) throw friendly(error, "No pudimos dar de alta el negocio.");
	const row = (Array.isArray(data) ? data[0] : data) as {
		business_name?: string;
	} | null;
	return row?.business_name ?? "tu negocio";
}

export async function loadMyBusiness(
	client: SupabaseClient,
	userId: string,
): Promise<VendorBusiness | null> {
	const { data, error } = await client
		.from("businesses")
		.select(BUSINESS_COLUMNS)
		.eq("owner_user_id", userId)
		.order("name")
		.limit(1)
		.maybeSingle();
	if (error) throw friendly(error, "No pudimos cargar tu negocio.");
	return data as VendorBusiness | null;
}

export async function setOpen(
	client: SupabaseClient,
	businessId: string,
	open: boolean,
): Promise<void> {
	const { error } = await client
		.from("businesses")
		.update({ is_open: open })
		.eq("id", businessId);
	if (error) throw friendly(error, "No pudimos cambiar el estado.");
}

export async function loadProducts(
	client: SupabaseClient,
	businessId: string,
): Promise<VendorProduct[]> {
	const { data, error } = await client
		.from("business_products")
		.select(PRODUCT_COLUMNS)
		.eq("business_id", businessId)
		.order("sort_order")
		.order("created_at");
	if (error) throw friendly(error, "No pudimos cargar tus productos.");
	return (data ?? []) as VendorProduct[];
}

export async function addProduct(
	client: SupabaseClient,
	businessId: string,
	input: ProductInput,
	sortOrder: number,
): Promise<void> {
	const { error } = await client.from("business_products").insert({
		business_id: businessId,
		name: input.name.trim(),
		price_cop: input.priceCop,
		sort_order: sortOrder,
	});
	if (error) throw friendly(error, "No pudimos guardar el producto.");
}

export async function updateProduct(
	client: SupabaseClient,
	productId: string,
	patch: Partial<Pick<VendorProduct, "name" | "price_cop" | "is_available">>,
): Promise<void> {
	const { error } = await client
		.from("business_products")
		.update(patch)
		.eq("id", productId);
	if (error) throw friendly(error, "No pudimos guardar el cambio.");
}

export async function deleteProduct(
	client: SupabaseClient,
	productId: string,
): Promise<void> {
	const { error } = await client
		.from("business_products")
		.delete()
		.eq("id", productId);
	if (error) throw friendly(error, "No pudimos borrar el producto.");
}

/** Times of today's visits (only times: nothing about the visitor is stored). */
export async function loadTodayVisits(
	client: SupabaseClient,
	businessId: string,
): Promise<string[]> {
	const { data, error } = await client
		.from("business_visits")
		.select("visited_at")
		.eq("business_id", businessId)
		.gte("visited_at", startOfTodayBogota())
		.order("visited_at");
	if (error) throw friendly(error, "No pudimos cargar tus visitas.");
	return (data ?? []).map((row) => String(row.visited_at));
}

/** Calls back on every new visit to this business. Returns a function that stops listening. */
export function watchVisits(
	client: SupabaseClient,
	businessId: string,
	onVisit: () => void,
): () => void {
	const channel = client
		.channel(`vendor-visits-${businessId}`)
		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "business_visits",
				filter: `business_id=eq.${businessId}`,
			},
			onVisit,
		)
		.subscribe();
	return () => void client.removeChannel(channel);
}
