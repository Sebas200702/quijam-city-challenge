import {
	Check,
	CloudOff,
	Copy,
	Database,
	Download,
	ExternalLink,
	FileSpreadsheet,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
	OpenDataCatalogItem,
	OpenDataCatalogPayload,
	OpenDataDimension,
	OpenDataOrigin,
} from "../../lib/open-data/open-data-types";
import { BottomNav } from "../home/bottom-nav";
import { QuillartLogo } from "../home/quillart-logo";
import { TopNav } from "../home/top-nav";
import { SecondaryMenu } from "../visitor-home/secondary-menu";

type OriginFilter = "all" | OpenDataOrigin;

const DIMENSION_LABELS: Record<OpenDataDimension, string> = {
	territorio: "Territorio",
	sostenibilidad: "Sostenibilidad",
	ciudad_inteligente: "Ciudad inteligente",
	ciudadania: "Ciudadanía",
	economia: "Economía",
};

function formatPreviewCell(
	value: string | number | boolean | null | undefined,
): string {
	if (value === null || value === undefined || value === "") return "—";
	if (typeof value === "boolean") return value ? "Sí" : "No";
	const text = String(value);
	return text.length > 48 ? `${text.slice(0, 45)}…` : text;
}

interface DatasetCardProps {
	dataset: OpenDataCatalogItem;
	copiedSlug: string | null;
	onCopyEndpoint: (slug: string, path: string) => void;
}

function DatasetCard({
	dataset,
	copiedSlug,
	onCopyEndpoint,
}: DatasetCardProps) {
	const isCopied = copiedSlug === dataset.slug;
	const previewColumns = dataset.columns.slice(0, 5);

	return (
		<article className="q-card h-full">
			<div
				className={`q-band ${
					dataset.origin === "community" ? "q-band--green" : "q-band--gold"
				}`}
				aria-hidden="true"
			/>
			<div className="q-card__head">
				<div className="min-w-0">
					<p className="q-eyebrow">{DIMENSION_LABELS[dataset.dimension]}</p>
					<h3 className="q-h2 mt-1">{dataset.title}</h3>
				</div>
				<span
					className={`q-badge ${
						dataset.origin === "community"
							? "q-badge--optimal"
							: "q-badge--neutral"
					}`}
				>
					{dataset.recordCount} registro{dataset.recordCount === 1 ? "" : "s"}
				</span>
			</div>

			<div className="q-card__body flex-1 space-y-4">
				<p className="q-p q-muted">{dataset.description}</p>

				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-muted)]">
					<span>
						Licencia:{" "}
						<a
							href={dataset.licenseUrl}
							target="_blank"
							rel="noreferrer"
							className="font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
						>
							{dataset.license}
						</a>
					</span>
					<span>{dataset.columns.length} campos públicos</span>
					<span>{dataset.privacyNote}</span>
				</div>

				<div className="flex flex-wrap gap-2">
					<a
						href={dataset.endpoints.csv}
						download={`quillart-${dataset.slug}.csv`}
						className="q-btn q-btn--secondary q-btn--sm min-h-11"
					>
						<FileSpreadsheet size={16} strokeWidth={1.75} aria-hidden="true" />
						Descargar CSV
					</a>
					<a
						href={`${dataset.endpoints.json}&download=1`}
						download={`quillart-${dataset.slug}.json`}
						className="q-btn q-btn--secondary q-btn--sm min-h-11"
					>
						<Download size={16} strokeWidth={1.75} aria-hidden="true" />
						Descargar JSON
					</a>
					<button
						type="button"
						onClick={() =>
							onCopyEndpoint(dataset.slug, `/api/datos/${dataset.slug}`)
						}
						className="q-btn q-btn--ghost q-btn--sm min-h-11"
					>
						{isCopied ? (
							<Check size={16} strokeWidth={1.75} aria-hidden="true" />
						) : (
							<Copy size={16} strokeWidth={1.75} aria-hidden="true" />
						)}
						{isCopied ? "URL copiada" : "Copiar API"}
					</button>
				</div>

				<details className="q-details">
					<summary>Ver campos y muestra ({dataset.columns.length})</summary>
					<div className="q-details__body space-y-3">
						<div className="flex flex-wrap gap-1.5">
							{dataset.columns.map((column) => (
								<code
									key={column}
									className="rounded-[var(--radius-xs)] bg-[var(--surface)] px-2 py-0.5 font-mono text-xs text-[var(--ink)]"
								>
									{column}
								</code>
							))}
						</div>

						{dataset.previewRows.length === 0 ? (
							<p className="q-sm q-muted">
								Aún no hay registros publicados en este conjunto.
							</p>
						) : (
							<div className="q-scroll rounded-[var(--radius-sm)] bg-[var(--surface)]">
								<table className="min-w-full divide-y divide-[var(--line)] text-left text-xs">
									<thead>
										<tr className="text-[var(--ink-muted)]">
											{previewColumns.map((col) => (
												<th key={col} className="px-2.5 py-2 font-mono">
													{col}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line)]">
										{dataset.previewRows.map((row) => {
											const primaryKey = dataset.columns[0] ?? "id";
											const rowKey = `${dataset.slug}-${String(row[primaryKey] ?? JSON.stringify(row))}`;
											return (
												<tr key={rowKey}>
													{previewColumns.map((col) => (
														<td
															key={col}
															className="px-2.5 py-2 text-[var(--ink)]"
														>
															{formatPreviewCell(row[col])}
														</td>
													))}
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}

						<p className="font-mono text-xs text-[var(--ink-subtle)] break-all">
							GET /api/datos/{dataset.slug}?format=json | csv
						</p>
					</div>
				</details>
			</div>
		</article>
	);
}

interface OpenDataPortalProps {
	initialCatalog: OpenDataCatalogPayload;
	aiHref?: string;
}

export function OpenDataPortal({
	initialCatalog,
	aiHref = "/inicio",
}: OpenDataPortalProps) {
	const [catalog, setCatalog] =
		useState<OpenDataCatalogPayload>(initialCatalog);
	const [filter, setFilter] = useState<OriginFilter>("all");
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isOnline, setIsOnline] = useState(true);
	const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
	const copyTimerRef = useRef<number | null>(null);

	useEffect(() => {
		setIsOnline(navigator.onLine);
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
			if (copyTimerRef.current !== null) {
				window.clearTimeout(copyTimerRef.current);
			}
		};
	}, []);

	const communityDatasets = useMemo(
		() => catalog.datasets.filter((item) => item.origin === "community"),
		[catalog.datasets],
	);
	const referenceDatasets = useMemo(
		() => catalog.datasets.filter((item) => item.origin === "reference"),
		[catalog.datasets],
	);
	const totalRecords = useMemo(
		() => catalog.datasets.reduce((total, item) => total + item.recordCount, 0),
		[catalog.datasets],
	);

	async function handleRefresh() {
		if (!navigator.onLine) {
			setError("Sin conexión. Vuelve a intentarlo cuando recuperes señal.");
			return;
		}
		setRefreshing(true);
		setError(null);
		try {
			const response = await fetch("/api/datos/");
			if (!response.ok) {
				throw new Error("No pudimos actualizar el catálogo de datos abiertos.");
			}
			const fresh = (await response.json()) as OpenDataCatalogPayload;
			setCatalog((previous) => ({
				...fresh,
				datasets: fresh.datasets.map((item) => {
					const existing = previous.datasets.find(
						(prev) => prev.slug === item.slug,
					);
					return {
						...item,
						previewRows: existing?.previewRows ?? [],
					};
				}),
			}));
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "No pudimos actualizar el catálogo.",
			);
		} finally {
			setRefreshing(false);
		}
	}

	async function handleCopyEndpoint(slug: string, path: string) {
		try {
			const fullUrl = new URL(path, window.location.origin).toString();
			await navigator.clipboard.writeText(fullUrl);
			setCopiedSlug(slug);
			if (copyTimerRef.current !== null) {
				window.clearTimeout(copyTimerRef.current);
			}
			copyTimerRef.current = window.setTimeout(() => {
				setCopiedSlug(null);
				copyTimerRef.current = null;
			}, 2000);
		} catch {
			setCopiedSlug(null);
		}
	}

	const showCommunity = filter === "all" || filter === "community";
	const showReference = filter === "all" || filter === "reference";
	const visibleCount =
		(showCommunity ? communityDatasets.length : 0) +
		(showReference ? referenceDatasets.length : 0);

	return (
		<div className="mx-auto flex min-h-[calc(100dvh-3px)] w-full max-w-md flex-col lg:max-w-6xl">
			<header className="flex items-center gap-3 px-4 pt-4 lg:gap-6 lg:px-8 lg:pt-6">
				<a
					href="/inicio"
					className="flex min-w-0 flex-1 no-underline text-inherit"
				>
					<QuillartLogo />
				</a>
				<TopNav current="map" aiHref={aiHref} />
				<SecondaryMenu />
			</header>

			<main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-24 lg:gap-8 lg:px-8 lg:pt-8 lg:pb-16">
				<section className="q-card">
					<div className="q-flag" aria-hidden="true">
						<i />
						<i />
						<i />
					</div>
					<div className="q-card__head">
						<div>
							<p className="q-eyebrow">
								Legado abierto · Ciudad inteligente · Barranquilla
							</p>
							<h1 className="q-h1 mt-1">Portal de datos abiertos</h1>
							<p className="q-p q-muted mt-2 max-w-2xl">
								Descarga en CSV o JSON los conjuntos públicos de QUILLART sin
								registro y sin datos personales.
							</p>
						</div>
					</div>

					<div className="q-card__body space-y-4">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4">
								<p className="q-eyebrow flex items-center gap-1.5">
									<Database size={14} strokeWidth={1.75} aria-hidden="true" />
									Conjuntos publicados
								</p>
								<p className="q-num mt-1 text-2xl font-bold text-[var(--ink)]">
									{catalog.totalDatasets}
								</p>
								<p className="q-sm q-muted mt-0.5">
									{totalRecords} registros públicos
								</p>
							</div>
							<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4">
								<p className="q-eyebrow">Licencia abierta</p>
								<p className="q-num mt-1 text-2xl font-bold text-[var(--ink)]">
									{catalog.license}
								</p>
								<a
									href={catalog.licenseUrl}
									target="_blank"
									rel="noreferrer"
									className="q-sm text-[var(--green-text)] underline-offset-2 hover:underline"
								>
									Ver términos de uso
								</a>
							</div>
							<div className="rounded-[var(--radius-md)] bg-[var(--bg)] p-4">
								<p className="q-eyebrow flex items-center gap-1.5">
									<ShieldCheck
										size={14}
										strokeWidth={1.75}
										aria-hidden="true"
									/>
									Privacidad por diseño
								</p>
								<p className="q-p mt-1 font-semibold text-[var(--ink)]">
									Cero datos personales
								</p>
								<p className="q-sm q-muted mt-0.5">
									Ley 1581 de 2012 · Sin cuentas ni inscripciones
								</p>
							</div>
						</div>

						<details className="q-details">
							<summary>Acceso por API pública</summary>
							<div className="q-details__body space-y-3">
								<p className="q-sm q-muted">
									Consulta el catálogo o cada conjunto directamente en JSON o
									CSV desde otra aplicación.
								</p>
								<code className="block rounded-[var(--radius-sm)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--ink)] break-all">
									GET /api/datos/ · GET /api/datos/[conjunto]?format=json|csv
								</code>
								<div className="flex flex-wrap items-center gap-2">
									<a
										href="/api/datos/"
										target="_blank"
										rel="noreferrer"
										className="q-btn q-btn--secondary q-btn--sm min-h-11"
									>
										<ExternalLink
											size={15}
											strokeWidth={1.75}
											aria-hidden="true"
										/>
										Abrir /api/datos/
									</a>
									<button
										type="button"
										onClick={() =>
											void handleCopyEndpoint("__index", "/api/datos/")
										}
										className="q-btn q-btn--ghost q-btn--sm min-h-11"
									>
										{copiedSlug === "__index" ? (
											<Check size={16} strokeWidth={1.75} aria-hidden="true" />
										) : (
											<Copy size={16} strokeWidth={1.75} aria-hidden="true" />
										)}
										{copiedSlug === "__index"
											? "URL copiada"
											: "Copiar /api/datos/"}
									</button>
									<button
										type="button"
										disabled={refreshing}
										aria-busy={refreshing}
										onClick={() => void handleRefresh()}
										className="q-btn q-btn--ghost q-btn--sm min-h-11"
									>
										<RefreshCw
											size={16}
											strokeWidth={1.75}
											aria-hidden="true"
										/>
										{refreshing ? "Actualizando…" : "Actualizar conteos"}
									</button>
								</div>
							</div>
						</details>
					</div>
				</section>

				{!isOnline && (
					<div role="status" className="q-alert q-alert--info">
						<span className="q-alert__icon" aria-hidden="true">
							<CloudOff size={18} strokeWidth={1.75} />
						</span>
						<div className="q-alert__body">
							<p className="q-alert__title">Sin conexión</p>
							<p className="q-alert__text">
								Estás viendo el último catálogo cargado. Para descargar archivos
								actualizados vuelve a conectarte.
							</p>
						</div>
					</div>
				)}

				{error && (
					<div role="alert" className="q-alert q-alert--alert">
						<div className="q-alert__body">
							<p className="q-alert__title">
								No pudimos actualizar el catálogo
							</p>
							<p className="q-alert__text">{error}</p>
						</div>
						<button
							type="button"
							onClick={() => void handleRefresh()}
							className="q-btn q-btn--secondary q-btn--sm min-h-11"
						>
							Reintentar
						</button>
					</div>
				)}

				<fieldset className="m-0 border-0 p-0">
					<legend className="q-sr">Filtrar conjuntos por origen</legend>
					<div className="q-seg flex-wrap">
						<button
							type="button"
							aria-pressed={filter === "all"}
							onClick={() => setFilter("all")}
							className={`q-seg__opt min-h-11 ${filter === "all" ? "is-on" : ""}`}
						>
							Todos ({catalog.totalDatasets})
						</button>
						<button
							type="button"
							aria-pressed={filter === "community"}
							onClick={() => setFilter("community")}
							className={`q-seg__opt min-h-11 ${
								filter === "community" ? "is-on" : ""
							}`}
						>
							Comunidad ({communityDatasets.length})
						</button>
						<button
							type="button"
							aria-pressed={filter === "reference"}
							onClick={() => setFilter("reference")}
							className={`q-seg__opt min-h-11 ${
								filter === "reference" ? "is-on" : ""
							}`}
						>
							Corredor · referencia ({referenceDatasets.length})
						</button>
					</div>
				</fieldset>

				{visibleCount === 0 ? (
					<section className="q-card q-state q-state--empty">
						<div className="q-state__glyph" aria-hidden="true">
							<Database size={26} strokeWidth={1.75} />
						</div>
						<h2 className="q-state__title">No hay conjuntos en este filtro</h2>
						<p className="q-state__text">
							Selecciona otro filtro para ver todos los conjuntos publicados.
						</p>
					</section>
				) : (
					<div className="space-y-8">
						{showCommunity && communityDatasets.length > 0 && (
							<section
								className="space-y-4"
								aria-labelledby="community-datasets"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="q-eyebrow">Plataforma ciudadana</p>
										<h2 id="community-datasets" className="q-h2 mt-0.5">
											Datos de la comunidad
										</h2>
									</div>
									<span className="q-badge q-badge--optimal">
										Publicados y moderados
									</span>
								</div>
								<ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
									{communityDatasets.map((dataset) => (
										<li key={dataset.slug}>
											<DatasetCard
												dataset={dataset}
												copiedSlug={copiedSlug}
												onCopyEndpoint={handleCopyEndpoint}
											/>
										</li>
									))}
								</ul>
							</section>
						)}

						{showReference && referenceDatasets.length > 0 && (
							<section
								className="space-y-4"
								aria-labelledby="corridor-datasets"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="q-eyebrow">Corredor Estadio – Malecón</p>
										<h2 id="corridor-datasets" className="q-h2 mt-0.5">
											Conjuntos del corredor piloto
										</h2>
									</div>
									<span className="q-sim-tag">Datos de referencia</span>
								</div>
								<ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
									{referenceDatasets.map((dataset) => (
										<li key={dataset.slug}>
											<DatasetCard
												dataset={dataset}
												copiedSlug={copiedSlug}
												onCopyEndpoint={handleCopyEndpoint}
											/>
										</li>
									))}
								</ul>
							</section>
						)}
					</div>
				)}
			</main>

			<BottomNav current="map" aiHref={aiHref} />
		</div>
	);
}
