export interface WhatsAppOrder {
	vendorPhone: string;
	productTitle: string;
	productUrl: string;
}

export function buildWhatsAppUrl({ vendorPhone, productTitle, productUrl }: WhatsAppOrder): string {
	const phone = vendorPhone.replace(/\D/g, '');
	const text = `Hi, I want to order this: ${productTitle} - ${productUrl}`;
	return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function productPath(productId: string): string {
	return `/products/${encodeURIComponent(productId)}`;
}
