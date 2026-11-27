// Motion of the landing page: scroll reveals, the header state, the timeline of
// "Así de fácil", the pointer parallax of the hero scene and the ask box that
// types its own examples. Everything here is decoration: it runs only when the
// page opted into motion (`html.l-motion`, see index.astro and landing.css).

const TYPE_MS = 55;
const ERASE_MS = 22;
const HOLD_MS = 1800;
const GAP_MS = 450;

/** Adds `.is-in` to every `[data-reveal]` element the first time it is seen. */
function revealOnScroll(): void {
	const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
	if (!("IntersectionObserver" in window)) {
		for (const target of targets) target.classList.add("is-in");
		return;
	}
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.classList.add("is-in");
				observer.unobserve(entry.target);
			}
		},
		{ threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
	);
	for (const target of targets) observer.observe(target);
}

/** How much of an element has passed the middle of the viewport, from 0 to 1. */
export function scrollProgress(
	top: number,
	height: number,
	viewport: number,
): number {
	if (height <= 0) return 1;
	const passed = viewport * 0.62 - top;
	return Math.min(1, Math.max(0, passed / height));
}

/** Header shadow after the first scroll, and the fill of the steps timeline. */
function trackScroll(): void {
	const header = document.querySelector<HTMLElement>("[data-landing-header]");
	const steps = document.querySelector<HTMLElement>("[data-steps]");
	let queued = false;

	const update = () => {
		queued = false;
		header?.classList.toggle("is-scrolled", window.scrollY > 24);
		if (steps) {
			const box = steps.getBoundingClientRect();
			const progress = scrollProgress(box.top, box.height, window.innerHeight);
			steps.style.setProperty("--p", progress.toFixed(3));
		}
	};
	const request = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(update);
	};

	update();
	window.addEventListener("scroll", request, { passive: true });
	window.addEventListener("resize", request, { passive: true });
}

/** The phone and the floating cards drift a little with the pointer. */
function followPointer(): void {
	const canvas = document.querySelector<HTMLElement>("[data-hero-canvas]");
	if (!canvas || !matchMedia("(hover: hover) and (pointer: fine)").matches) {
		return;
	}
	const layers = [...canvas.querySelectorAll<HTMLElement>("[data-depth]")];
	let frame = 0;

	const place = (x: number, y: number) => {
		for (const layer of layers) {
			const depth = Number(layer.dataset.depth) || 0;
			layer.style.setProperty("--px", `${(x * depth).toFixed(1)}px`);
			layer.style.setProperty("--py", `${(y * depth).toFixed(1)}px`);
		}
	};

	canvas.addEventListener("pointermove", (event) => {
		const box = canvas.getBoundingClientRect();
		const x = (event.clientX - box.left) / box.width - 0.5;
		const y = (event.clientY - box.top) / box.height - 0.5;
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => place(x, y));
	});
	canvas.addEventListener("pointerleave", () => {
		cancelAnimationFrame(frame);
		place(0, 0);
	});
}

/**
 * Types the example questions of the chips into the placeholder of the ask box,
 * one after another. It reads the chips each round, so it follows the language.
 * It stops while the person is in the box or has written something.
 */
function typeExamples(): void {
	const input = document.querySelector<HTMLInputElement>("[data-hero-ask]");
	if (!input) return;
	let round = 0;
	let timer = 0;

	const examples = () =>
		[...document.querySelectorAll<HTMLElement>("[data-hero-chip]")]
			.map((chip) => chip.textContent?.trim() ?? "")
			.filter(Boolean);
	const busy = () =>
		document.activeElement === input || input.value !== "" || document.hidden;
	const wait = (step: () => void, ms: number) => {
		timer = window.setTimeout(step, ms);
	};

	const type = (text: string, length: number) => {
		if (busy()) return wait(() => type(text, length), HOLD_MS);
		input.placeholder = text.slice(0, length);
		if (length < text.length)
			return wait(() => type(text, length + 1), TYPE_MS);
		wait(() => erase(text, text.length), HOLD_MS);
	};
	const erase = (text: string, length: number) => {
		if (busy()) return wait(() => erase(text, length), HOLD_MS);
		input.placeholder = text.slice(0, length);
		if (length > 0) return wait(() => erase(text, length - 1), ERASE_MS);
		wait(next, GAP_MS);
	};
	const next = () => {
		const list = examples();
		if (list.length === 0) return;
		const text = list[round % list.length];
		round += 1;
		type(text, 1);
	};

	// Let the visitor read the real placeholder first.
	wait(() => erase(input.placeholder, input.placeholder.length), 2600);
	input.addEventListener("focus", () => {
		const list = examples();
		if (list.length > 0) input.placeholder = list[(round || 1) - 1] ?? list[0];
	});
	window.addEventListener("pagehide", () => window.clearTimeout(timer));
}

export function initLandingMotion(): void {
	const root = document.documentElement;
	if (!root.classList.contains("l-motion")) return;
	// Tells the inline guard in index.astro that motion is being handled.
	root.dataset.landingMotion = "on";
	try {
		revealOnScroll();
		trackScroll();
		followPointer();
		typeExamples();
	} catch {
		root.classList.remove("l-motion");
	}
}
