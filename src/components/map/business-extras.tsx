import { MapPinCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n/use-language";
import { formatCop } from "../../lib/vendor/vendor-logic";

interface Product {
	name: string;
	price_cop: number;
}

type VisitState = "idle" | "sending" | "saved" | "error";

/** Menu with prices and "Estoy aquí" for a business card on the map (#49). */
export function BusinessExtras({
	code,
	isOpen,
}: {
	code: string;
	isOpen: boolean;
}) {
	const t = useT().map;
	const [products, setProducts] = useState<Product[]>([]);
	const [visit, setVisit] = useState<VisitState>("idle");
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		setVisit("idle");
		setMessage(null);
		let cancelled = false;
		void import("../../lib/supabase")
			.then(async ({ supabase }) => {
				const { data } = await supabase
					.from("business_products")
					.select("name, price_cop, businesses!inner(code)")
					.eq("businesses.code", code)
					.eq("is_available", true)
					.order("sort_order");
				if (!cancelled) setProducts((data ?? []) as Product[]);
			})
			.catch(() => {
				// No Supabase: no menu to show.
			});
		return () => {
			cancelled = true;
		};
	}, [code]);

	async function markVisit() {
		setVisit("sending");
		try {
			const response = await fetch("/api/vendor/visit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ businessCode: code }),
			});
			if (response.ok || response.status === 429) {
				setVisit("saved");
				setMessage(t.visitThanks);
			} else {
				setVisit("error");
				setMessage(t.visitError);
			}
		} catch {
			setVisit("error");
			setMessage(t.visitOffline);
		}
	}

	return (
		<div className="space-y-3">
			{products.length > 0 && (
				<ul className="space-y-1" aria-label={t.businessMenu}>
					{products.map((product) => (
						<li
							key={product.name}
							className="flex justify-between gap-3 text-sm"
						>
							<span>{product.name}</span>
							<b className="q-num">{formatCop(product.price_cop)}</b>
						</li>
					))}
				</ul>
			)}
			{isOpen && (
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--block"
					disabled={visit === "sending" || visit === "saved"}
					onClick={() => void markVisit()}
				>
					<MapPinCheck size={20} strokeWidth={1.75} aria-hidden="true" />
					{visit === "saved" ? t.visitSaved : t.visitHere}
				</button>
			)}
			{message && (
				<p role="status" className="q-sm q-muted">
					{message}
				</p>
			)}
		</div>
	);
}
