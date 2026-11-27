import { Check, Languages } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
	LANGUAGE_NAMES,
	LANGUAGES,
	type Language,
} from "../../lib/i18n/languages";
import { setLanguage, useLanguage, useT } from "../../lib/i18n/use-language";

/**
 * Accessibility button: changes the interface language (Spanish, English,
 * Portuguese or French). Keyboard: Enter/Space opens, Esc closes and returns
 * focus to the button. The choice is saved on the device.
 */
export function LanguageSwitcher() {
	const language = useLanguage();
	const t = useT();
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const button = useRef<HTMLButtonElement>(null);
	const menuId = useId();

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!root.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			button.current?.focus();
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	function choose(next: Language) {
		setLanguage(next);
		setOpen(false);
		button.current?.focus();
	}

	return (
		<div ref={root} className="relative shrink-0">
			<button
				ref={button}
				type="button"
				className="q-fab"
				aria-label={`${t.language.button}: ${LANGUAGE_NAMES[language]}`}
				aria-haspopup="true"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				onClick={() => setOpen((value) => !value)}
			>
				<Languages size={20} strokeWidth={1.75} aria-hidden="true" />
			</button>
			{open && (
				<div
					id={menuId}
					className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-card)]"
				>
					<p className="q-sm q-muted px-3 py-2">{t.language.menuTitle}</p>
					<ul className="m-0 list-none p-0">
						{LANGUAGES.map((code) => (
							<li key={code}>
								<button
									type="button"
									lang={code}
									aria-current={code === language ? "true" : undefined}
									className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-transparent px-3 text-left text-[15px] font-semibold text-[var(--ink)] lg:hover:bg-[var(--line)]"
									onClick={() => choose(code)}
								>
									{LANGUAGE_NAMES[code]}
									{code === language && (
										<Check
											size={18}
											aria-hidden="true"
											className="shrink-0 text-[var(--gold-text)]"
										/>
									)}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
