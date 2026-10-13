const bdt = new Intl.NumberFormat('en-BD', {
	style: 'currency',
	currency: 'BDT',
	currencyDisplay: 'narrowSymbol',
	maximumFractionDigits: 2,
});

export function formatBdt(minor: number): string {
	return bdt.format(minor / 100);
}

export function groupByCategory<T extends { category: string }>(items: T[]): [string, T[]][] {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
	}
	return [...groups.entries()];
}
