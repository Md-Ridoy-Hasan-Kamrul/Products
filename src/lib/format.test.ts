import { expect, test } from 'vitest';
import { formatBdt, formatDay, groupByCategory, toCsv } from './format';

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

test('formats a calendar day without shifting it across time zones', () => {
	expect(formatDay('2026-10-17')).toMatch(/^(17 Oct|Oct 17)$/);
});

test('CSV quotes cells and defuses spreadsheet formulas', () => {
	expect(toCsv([['Name', 'Price'], ['Say "hi", ok', 250], ['=SUM(A1)', -1]])).toBe(
		`"Name","Price"\r\n"Say ""hi"", ok","250"\r\n"'=SUM(A1)","-1"`,
	);
});
