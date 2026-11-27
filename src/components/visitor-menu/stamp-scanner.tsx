import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BarcodeDetectorLike {
	detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

declare global {
	interface Window {
		BarcodeDetector?: new (opts: {
			formats: string[];
		}) => BarcodeDetectorLike;
	}
}

/**
 * Reads a QR with the camera when the browser can (BarcodeDetector), and always
 * offers typing the code, so the passport works on any phone.
 */
export function StampScanner({
	onCode,
	onClose,
}: {
	onCode: (text: string) => void;
	onClose: () => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [cameraOn, setCameraOn] = useState(false);
	const [manual, setManual] = useState("");

	useEffect(() => {
		if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) return;
		let stream: MediaStream | null = null;
		let timer = 0;
		let stopped = false;
		const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: "environment" } })
			.then((s) => {
				if (stopped) {
					for (const t of s.getTracks()) t.stop();
					return;
				}
				stream = s;
				const video = videoRef.current;
				if (!video) return;
				video.srcObject = s;
				void video.play();
				setCameraOn(true);
				timer = window.setInterval(async () => {
					try {
						const found = await detector.detect(video);
						if (found[0]?.rawValue) onCode(found[0].rawValue);
					} catch {
						// A frame that cannot be read is skipped.
					}
				}, 500);
			})
			.catch(() => setCameraOn(false));
		return () => {
			stopped = true;
			window.clearInterval(timer);
			if (stream) for (const t of stream.getTracks()) t.stop();
		};
	}, [onCode]);

	const submit = (event: { preventDefault(): void }) => {
		event.preventDefault();
		if (manual.trim()) onCode(manual);
	};

	return (
		<section className="vm-scanner" aria-label="Escanear QR">
			<div className="vm-scanner__head">
				<b>Escanear QR</b>
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--sm"
					onClick={onClose}
					aria-label="Cerrar el escáner"
				>
					<X size={16} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>
			{/* biome-ignore lint/a11y/useMediaCaption: live camera preview has no audio */}
			<video
				ref={videoRef}
				className="vm-scanner__video"
				muted
				playsInline
				hidden={!cameraOn}
			/>
			{!cameraOn && (
				<p className="q-sm q-muted">
					Tu celular no deja usar la cámara aquí. Escribe el código que está
					debajo del QR.
				</p>
			)}
			<form className="vm-scanner__form" onSubmit={submit}>
				<label className="q-sm" htmlFor="stamp-code">
					Código del QR
				</label>
				<input
					id="stamp-code"
					className="q-input"
					value={manual}
					onChange={(e) => setManual(e.target.value)}
					placeholder="quillart:sello:negocio:…"
					autoComplete="off"
					autoCapitalize="off"
					spellCheck={false}
				/>
				<button type="submit" className="q-btn q-btn--primary">
					Sumar sello
				</button>
			</form>
		</section>
	);
}
