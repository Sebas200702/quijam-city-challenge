import type { SupabaseClient } from "@supabase/supabase-js";
import { BadgeCheck, Eye, LogOut, Plus, Store, Trash2 } from "lucide-react";
import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import {
	formatCop,
	parsePriceCop,
	validateProduct,
	visitsByHour,
} from "../../lib/vendor/vendor-logic";
import {
	addProduct,
	currentUserId,
	deleteProduct,
	loadMyBusiness,
	loadProducts,
	loadTodayVisits,
	setOpen,
	updateProduct,
	vendorClient,
	watchVisits,
} from "../../lib/vendor/vendor-service";
import type {
	VendorBusiness,
	VendorProduct,
} from "../../lib/vendor/vendor-types";

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;
const INPUT =
	"h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-3 text-[15px] text-[var(--ink)]";

type Load =
	| { kind: "loading" }
	| { kind: "no-backend" }
	| { kind: "no-business" }
	| { kind: "error"; message: string }
	| { kind: "ready"; client: SupabaseClient; business: VendorBusiness };

/** /vendedor: open or close, products and prices, and today's visits (#49). */
export default function VendorPortal() {
	const [load, setLoad] = useState<Load>({ kind: "loading" });
	const [products, setProducts] = useState<VendorProduct[]>([]);
	const [visits, setVisits] = useState<string[]>([]);
	const [confirmClose, setConfirmClose] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draftName, setDraftName] = useState("");
	const [draftPrice, setDraftPrice] = useState("");

	useEffect(() => {
		void (async () => {
			const client = await vendorClient();
			if (!client) return setLoad({ kind: "no-backend" });
			const userId = await currentUserId(client);
			if (!userId) return window.location.replace("/vendedor/entrar");
			try {
				const business = await loadMyBusiness(client, userId);
				setLoad(
					business
						? { kind: "ready", client, business }
						: { kind: "no-business" },
				);
			} catch (reason) {
				setLoad({
					kind: "error",
					message: reason instanceof Error ? reason.message : String(reason),
				});
			}
		})();
	}, []);

	const client = load.kind === "ready" ? load.client : null;
	const business = load.kind === "ready" ? load.business : null;
	const businessId = business?.id;

	const refresh = useCallback(async () => {
		if (!client || !businessId) return;
		const [items, times] = await Promise.all([
			loadProducts(client, businessId),
			loadTodayVisits(client, businessId),
		]);
		setProducts(items);
		setVisits(times);
	}, [client, businessId]);

	useEffect(() => {
		if (!client || !businessId) return;
		void refresh().catch((reason: unknown) =>
			setError(reason instanceof Error ? reason.message : String(reason)),
		);
		return watchVisits(client, businessId, () => {
			void loadTodayVisits(client, businessId).then(setVisits);
		});
	}, [client, businessId, refresh]);

	async function run(action: () => Promise<void>) {
		setBusy(true);
		setError(null);
		try {
			await action();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		} finally {
			setBusy(false);
		}
	}

	if (load.kind === "loading")
		return (
			<p className="q-sm q-subtle px-4 py-10 text-center">
				Cargando tu negocio…
			</p>
		);
	if (load.kind === "no-backend")
		return (
			<p
				role="alert"
				className="mx-auto max-w-md px-4 py-10 text-center text-[var(--red-text)]"
			>
				El portal necesita la conexión con la base de datos de la ciudad, que no
				está configurada aquí.
			</p>
		);
	if (load.kind === "error")
		return (
			<p
				role="alert"
				className="mx-auto max-w-md px-4 py-10 text-center text-[var(--red-text)]"
			>
				{load.message}
			</p>
		);
	if (load.kind === "no-business")
		return (
			<main className="mx-auto max-w-md space-y-4 px-4 py-10">
				<h1 className="q-h1">Aún no tienes un negocio</h1>
				<p className="q-sm q-subtle">
					Pide a la ciudad tu código de alta y escanéalo con la cámara. Tu
					negocio quedará a tu nombre con el sello de negocio verificado.
				</p>
			</main>
		);

	const { client: supabase, business: shop } = load;
	const hours = visitsByHour(visits);
	const peak = Math.max(1, ...hours);
	const allHours = hours.map((count, hour) => ({ count, hour }));

	const toggleOpen = (open: boolean) =>
		run(async () => {
			await setOpen(supabase, shop.id, open);
			setLoad({ ...load, business: { ...shop, is_open: open } });
			setConfirmClose(false);
		});

	const submitProduct = (event: SyntheticEvent) => {
		event.preventDefault();
		const priceCop = parsePriceCop(draftPrice);
		const problem =
			priceCop === null
				? "Escribe el precio en pesos, por ejemplo 4.000."
				: validateProduct({ name: draftName, priceCop });
		if (problem || priceCop === null) return setError(problem);
		void run(async () => {
			await addProduct(
				supabase,
				shop.id,
				{ name: draftName, priceCop },
				products.length,
			);
			setDraftName("");
			setDraftPrice("");
			await refresh();
		});
	};

	return (
		<main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="q-eyebrow">Portal del vendedor</p>
					<h1 className="q-h1 mt-1">{shop.name}</h1>
					{shop.is_verified && shop.verification_status === "verified" ? (
						<p className="q-badge q-badge--optimal mt-2">
							<BadgeCheck size={16} strokeWidth={1.75} aria-hidden="true" />{" "}
							Negocio verificado
						</p>
					) : (
						<p className="q-badge q-badge--neutral mt-2">
							Verificación pendiente
						</p>
					)}
				</div>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm"
					onClick={() =>
						void supabase.auth
							.signOut()
							.then(() => window.location.assign("/vendedor/entrar"))
					}
				>
					<LogOut {...ICON} />
					Salir
				</button>
			</header>

			{error && (
				<p
					role="alert"
					className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
				>
					{error}
				</p>
			)}

			<section className="q-card" aria-labelledby="vendor-next">
				<div
					className={`q-band ${shop.is_open ? "q-band--green" : "q-band--gold"}`}
					aria-hidden="true"
				/>
				<div className="q-card__body space-y-3">
					<p className="q-eyebrow" id="vendor-next">
						Tu siguiente paso
					</p>
					<p className="q-h2" aria-live="polite">
						<Store
							size={22}
							strokeWidth={1.75}
							aria-hidden="true"
							className="mr-2 inline"
						/>
						{shop.is_open ? "Abierto" : "Cerrado"}
					</p>
					<p className="q-sm q-subtle">
						{shop.is_open
							? "Los visitantes te ven abierto en el mapa en este momento."
							: "Cuando abras, apareces en el mapa y en las recomendaciones al instante."}
					</p>
					{!shop.is_open ? (
						<button
							type="button"
							className="q-btn q-btn--primary q-btn--lg w-full sm:w-auto"
							disabled={busy}
							onClick={() => void toggleOpen(true)}
						>
							Marcarme abierta
						</button>
					) : confirmClose ? (
						<div className="flex flex-wrap items-center gap-2" role="alert">
							<span className="q-sm">¿Cerrar por ahora?</span>
							<button
								type="button"
								className="q-btn q-btn--secondary q-btn--sm"
								disabled={busy}
								onClick={() => void toggleOpen(false)}
							>
								Sí, cerrar
							</button>
							<button
								type="button"
								className="q-btn q-btn--ghost q-btn--sm"
								onClick={() => setConfirmClose(false)}
							>
								Seguir abierta
							</button>
						</div>
					) : (
						<button
							type="button"
							className="q-btn q-btn--secondary q-btn--lg w-full sm:w-auto"
							disabled={busy}
							onClick={() => setConfirmClose(true)}
						>
							Marcarme cerrada
						</button>
					)}
				</div>
			</section>

			<section className="q-card" aria-labelledby="vendor-visits">
				<div className="q-card__head">
					<h2 id="vendor-visits" className="q-h2">
						Visitas de hoy
					</h2>
					<span className="q-num text-2xl font-bold" aria-live="polite">
						{visits.length}
					</span>
				</div>
				<div className="q-card__body">
					{visits.length === 0 ? (
						<p className="q-sm q-subtle">
							Todavía no hay visitas hoy. Cuando un visitante marque "Estoy
							aquí", aparece aquí.
						</p>
					) : (
						<ol
							className="flex h-24 items-end gap-1"
							aria-label="Visitas por hora del día"
						>
							{allHours.map(({ hour, count }) => (
								<li
									key={hour}
									className="flex flex-1 flex-col items-center gap-1"
									aria-label={`${hour}:00, ${count} visitas`}
								>
									<span
										className="block w-full rounded-t bg-[var(--gold)]"
										style={{ height: `${(count / peak) * 72}px` }}
									/>
									<span className="h-4 text-[10px] leading-4 text-[var(--ink-subtle)]">
										{hour % 3 === 0 ? hour : ""}
									</span>
								</li>
							))}
						</ol>
					)}
					<p className="q-sm q-subtle mt-3">
						Solo contamos visitas: nunca guardamos quién te visitó.
					</p>
				</div>
			</section>

			<section className="q-card" aria-labelledby="vendor-products">
				<div className="q-card__head">
					<h2 id="vendor-products" className="q-h2">
						Productos y precios
					</h2>
				</div>
				<div className="q-card__body space-y-4">
					{products.length === 0 ? (
						<p className="q-sm q-subtle">
							Agrega lo que vendes con su precio. Los visitantes lo ven en el
							mapa.
						</p>
					) : (
						<ul className="divide-y divide-[var(--line)]">
							{products.map((product) => (
								<li
									key={product.id}
									className="flex flex-wrap items-center justify-between gap-2 py-2"
								>
									<span
										className={
											product.is_available ? "" : "q-subtle line-through"
										}
									>
										{product.name} · <b>{formatCop(product.price_cop)}</b>
									</span>
									<span className="flex gap-2">
										<button
											type="button"
											className="q-btn q-btn--ghost q-btn--sm"
											disabled={busy}
											onClick={() =>
												void run(async () => {
													await updateProduct(supabase, product.id, {
														is_available: !product.is_available,
													});
													await refresh();
												})
											}
										>
											{product.is_available ? "Se acabó" : "Hay otra vez"}
										</button>
										<button
											type="button"
											className="q-btn q-btn--ghost q-btn--sm"
											aria-label={`Borrar ${product.name}`}
											disabled={busy}
											onClick={() =>
												void run(async () => {
													await deleteProduct(supabase, product.id);
													await refresh();
												})
											}
										>
											<Trash2 {...ICON} />
										</button>
									</span>
								</li>
							))}
						</ul>
					)}
					<form
						className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
						onSubmit={submitProduct}
					>
						<label className="sr-only" htmlFor="product-name">
							Producto
						</label>
						<input
							id="product-name"
							className={INPUT}
							placeholder="Arepa de huevo"
							maxLength={80}
							value={draftName}
							onChange={(event) => setDraftName(event.target.value)}
						/>
						<label className="sr-only" htmlFor="product-price">
							Precio en pesos
						</label>
						<input
							id="product-price"
							className={INPUT}
							inputMode="numeric"
							placeholder="4.000"
							value={draftPrice}
							onChange={(event) => setDraftPrice(event.target.value)}
						/>
						<button
							type="submit"
							className="q-btn q-btn--secondary"
							disabled={busy}
						>
							<Plus {...ICON} />
							Agregar
						</button>
					</form>
				</div>
			</section>

			<a
				href={`/mapa?negocio=${encodeURIComponent(shop.code)}`}
				className="q-btn q-btn--ghost"
			>
				<Eye {...ICON} />
				Cómo te ven en el mapa
			</a>
		</main>
	);
}
