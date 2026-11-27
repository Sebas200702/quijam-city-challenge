export interface VendorBusiness {
	id: string;
	code: string;
	name: string;
	category: string;
	zone: string;
	is_open: boolean;
	is_verified: boolean;
	verification_status: "pending" | "verified";
}

export interface VendorProduct {
	id: string;
	name: string;
	price_cop: number;
	is_available: boolean;
	sort_order: number;
}

export interface ProductInput {
	name: string;
	priceCop: number;
}
