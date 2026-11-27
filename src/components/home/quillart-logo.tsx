/** Brand mark: green tile with the white eight-point star, plus the wordmark. */
export function QuillartLogo() {
	return (
		<span className="ls-logo flex min-w-0 flex-1 items-center gap-3">
			<span
				className="q-logo__tile"
				style={{ width: 44, height: 44, borderRadius: "50%" }}
				aria-hidden="true"
			>
				<span className="q-star" style={{ width: 26, height: 26 }} />
			</span>
			<span className="min-w-0 flex-1 font-[var(--font-display)] text-lg font-bold tracking-[0.08em]">
				QUILLART
			</span>
		</span>
	);
}
