/** Brand mark: green tile with the white eight-point star, plus the wordmark. */
export function QuillartLogo() {
	return (
		<span className="flex min-w-0 flex-1 items-center gap-3">
			<span
				className="q-logo__tile"
				style={{ width: 48, height: 48, borderRadius: 16 }}
				aria-hidden="true"
			>
				<span className="q-star" style={{ width: 28, height: 28 }} />
			</span>
			<span className="min-w-0 flex-1 font-[var(--font-display)] text-lg font-bold tracking-[0.08em]">
				QUILLART
			</span>
		</span>
	);
}
