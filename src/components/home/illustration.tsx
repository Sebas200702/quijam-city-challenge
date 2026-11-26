interface IllustrationProps {
	src: string;
	/** Tailwind height classes for the image, e.g. "h-[76px] lg:h-24". */
	imageClassName: string;
}

/** unDraw illustration on the fixed light panel (decorative, so empty alt). */
export function Illustration({ src, imageClassName }: IllustrationProps) {
	return (
		<div className="q-illus" style={{ padding: 8, flex: "none" }}>
			<img src={src} alt="" className={`w-auto ${imageClassName}`} />
		</div>
	);
}
