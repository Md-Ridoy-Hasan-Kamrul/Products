import { expect, test } from 'vitest';
import { formatBdt, groupByCategory } from './format';

test('formats poisha as taka', () => {
	expect(formatBdt(25_000)).toMatch(/250/);
	expect(formatBdt(25_050)).toMatch(/250\.5/);
});

test('groups items by category in first-seen order', () => {
	const groups = groupByCategory([
		{ id: 1, category: 'Poetry' },
		{ id: 2, category: 'Fiction' },
		{ id: 3, category: 'Poetry' },
	]);
	expect(groups.map(([category, items]) => [category, items.map((i) => i.id)])).toEqual([
		['Poetry', [1, 3]],
		['Fiction', [2]],
	]);
});
