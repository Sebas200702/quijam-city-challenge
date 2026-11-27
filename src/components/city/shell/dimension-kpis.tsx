import {
	Accessibility,
	Database,
	Leaf,
	type LucideIcon,
	ShieldCheck,
	Store,
} from "lucide-react";
import type {
	DimensionKey,
	DimensionKpi,
} from "../../../lib/city-dashboard-utils";

const DIMENSION_ICONS: Record<DimensionKey, LucideIcon> = {
	territorio: Accessibility,
	sostenibilidad: Leaf,
	ciudad_inteligente: Database,
	ciudadania: ShieldCheck,
	economia: Store,
};

/** One chip silhouette per tile, so neighbours never match. */
const CHIP_SHAPES = [
	"l-ico--hex",
	"l-ico--circle",
	"l-ico--burst",
	"l-ico--shield",
	"l-ico--octagon",
] as const;

interface DimensionKpisProps {
	kpis: readonly DimensionKpi[];
}

/** One indicator per QUILLART dimension, with its source behind "Ver detalles". */
export function DimensionKpis({ kpis }: DimensionKpisProps) {
	return (
		<section
			id="indicadores"
			className="cs-kpis"
			aria-label="Indicadores: uno por dimensión"
		>
			{kpis.map((kpi, index) => {
				const Icon = DIMENSION_ICONS[kpi.key];
				return (
					<article
						key={kpi.key}
						className={`q-kpi cs-kpi cs-kpi--${kpi.tone} l-rise`}
						style={{ ["--i" as string]: index }}
					>
						<span
							className={`cs-kpi__chip ${CHIP_SHAPES[index % CHIP_SHAPES.length]}`}
							aria-hidden="true"
						>
							<Icon size={20} strokeWidth={1.75} />
						</span>
						<h2 className="q-kpi__label m-0">{kpi.label}</h2>
						<div className="q-kpi__row">
							<span className="q-kpi__value">
								{kpi.value}
								<small>{kpi.unit}</small>
							</span>
						</div>
						<span className="cs-sub">
							<span
								className={`cs-kpi__mark cs-kpi__mark--${kpi.tone}`}
								aria-hidden="true"
							/>
							{kpi.caption}
						</span>
						<details className="q-details">
							<summary>Ver detalles</summary>
							<div className="q-details__body">{kpi.details}</div>
						</details>
					</article>
				);
			})}
		</section>
	);
}
