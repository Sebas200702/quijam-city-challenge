import { Check, WifiOff } from "lucide-react";
import { useId, useState } from "react";
import { VISITOR_LANGUAGES } from "../../lib/home-content-language";
import type {
	VisitorLanguage,
	VisitorShellCopy,
} from "../../lib/home-content-types";
import { LanguageIllustration } from "./visitor-illustrations";
import { VisitorSheet } from "./visitor-sheet";

interface LanguageSheetProps {
	copy: VisitorShellCopy;
	current: VisitorLanguage;
	/** The browser's language, or null when it asks for none we support. */
	detected: VisitorLanguage | null;
	online: boolean;
	onChoose: (language: VisitorLanguage) => void;
	onClose: () => void;
}

/**
 * Language sheet (mockup visitante/base-03-idioma): marks the language detected in the
 * browser, changes in one tap and is remembered on this device.
 */
export function LanguageSheet({
	copy,
	current,
	detected,
	online,
	onChoose,
	onClose,
}: LanguageSheetProps) {
	const name = useId();
	const [picked, setPicked] = useState<VisitorLanguage>(current);

	const hintFor = (code: VisitorLanguage) => {
		if (code === detected) return copy.languageDetected;
		if (code === "es") return copy.languageCity;
		return copy.languageAvailable;
	};

	return (
		<VisitorSheet
			title={copy.languageTitle}
			hero={<LanguageIllustration />}
			closeLabel={copy.close}
			onClose={onClose}
			lang={current}
		>
			{detected ? (
				<p className="q-sm q-muted visitor-plain">{copy.languageIntro}</p>
			) : (
				<div
					className="q-state q-state--empty visitor-state--inline"
					role="status"
				>
					<p className="q-state__title">{copy.languageEmptyTitle}</p>
					<p className="q-state__text">{copy.languageEmptyText}</p>
				</div>
			)}
			<form
				className="visitor-stack"
				onSubmit={(event) => {
					event.preventDefault();
					onChoose(picked);
				}}
			>
				<fieldset className="visitor-fieldset">
					<legend className="q-sr">{copy.languageLegend}</legend>
					<ul className="visitor-options lab-options">
						{VISITOR_LANGUAGES.map(({ code, name: label }, index) => (
							<li
								key={code}
								className="l-rise"
								style={{ ["--i" as string]: index + 2 }}
							>
								<input
									className="visitor-radio"
									type="radio"
									name={name}
									id={`${name}-${code}`}
									value={code}
									checked={picked === code}
									onChange={() => setPicked(code)}
								/>
								<label className="visitor-option" htmlFor={`${name}-${code}`}>
									<span className="visitor-option__mark" aria-hidden="true" />
									<span className="visitor-option__text">
										<b lang={code}>{label}</b>
										<small>{hintFor(code)}</small>
									</span>
								</label>
							</li>
						))}
					</ul>
				</fieldset>
				{online ? null : (
					<p className="q-sm q-muted visitor-note">
						<WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
						{copy.languageOfflineNote}
					</p>
				)}
				<button type="submit" className="q-btn q-btn--primary q-btn--block l-cta">
					<Check size={18} strokeWidth={1.75} aria-hidden="true" />
					{copy.languageUse}
				</button>
			</form>
		</VisitorSheet>
	);
}
