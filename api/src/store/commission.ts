export function commissionFor(priceMinor: number, commissionBps: number): number {
	return Math.round((priceMinor * commissionBps) / 10_000);
}
