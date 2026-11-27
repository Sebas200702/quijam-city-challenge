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
			{kpis.map((kpi) => {
				const Icon = DIMENSION_ICONS[kpi.key];
				return (
					<article key={kpi.key} className="q-kpi cs-kpi">
						<h2 className="q-kpi__label m-0">
							<Icon
								className="cs-kpi__icon"
								size={16}
								strokeWidth={1.75}
								aria-hidden="true"
							/>
							{kpi.label}
						</h2>
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
