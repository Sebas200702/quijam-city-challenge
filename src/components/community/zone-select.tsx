// The person's neighborhood as a coarse AMB zone (docs/30, U36): a list, never free
// text and never an exact location. An old free-text value stays selectable as it
// was until the person picks a zone (the database refuses new free text).

import { AMB_ZONES, isAmbZone } from "../../lib/geo/amb-zones";
import { useT } from "../../lib/i18n/use-language";
import { Field, inputClass } from "./community-ui";

const BARRANQUILLA = AMB_ZONES.filter(
	(zone) => zone.municipality === "barranquilla",
);
const OTHERS = AMB_ZONES.filter((zone) => zone.municipality !== "barranquilla");

export function ZoneSelect({
	id,
	value,
	legacy,
	onChange,
}: {
	id: string;
	/** A zone key, the old free text, or "" for none. */
	value: string;
	/** Old free-text neighborhood of the profile, if any. */
	legacy?: string | null;
	onChange: (value: string) => void;
}) {
	const t = useT();
	const oldText = legacy && !isAmbZone(legacy) ? legacy : null;
	return (
		<Field
			id={id}
			label={t.geo.zone.label}
			hint={
				oldText && value === oldText
					? t.geo.zone.legacy(oldText)
					: t.geo.zone.hint
			}
		>
			<select
				id={id}
				className={inputClass}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				<option value="">{t.geo.zone.none}</option>
				{oldText && <option value={oldText}>{oldText}</option>}
				<optgroup label={t.geo.zone.groupBarranquilla}>
					{BARRANQUILLA.map((zone) => (
						<option key={zone.key} value={zone.key}>
							{zone.name}
						</option>
					))}
				</optgroup>
				<optgroup label={t.geo.zone.groupOthers}>
					{OTHERS.map((zone) => (
						<option key={zone.key} value={zone.key}>
							{zone.name}
						</option>
					))}
				</optgroup>
			</select>
		</Field>
	);
}
