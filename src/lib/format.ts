import { BPS_PER_PERCENT, POISHA_PER_TAKA } from './constants';

const TAKA_SIGN = '৳';
const PAISA_DIGITS = 2;
// Not the 'en-BD' currency style: browsers ship different locale data for it
// (Safari puts ৳ after the number), so server and client HTML would differ
// and React hydration would fail. Plain en-US digit grouping is the same everywhere.
const taka = new Intl.NumberFormat('en-US', { minimumFractionDigits: PAISA_DIGITS, maximumFractionDigits: PAISA_DIGITS });

export function formatBdt(minor: number): string {
	return `${TAKA_SIGN}${taka.format(minor / POISHA_PER_TAKA)}`;
}

export function groupByCategory<T extends { category: string }>(items: T[]): [string, T[]][] {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
	}
	return [...groups.entries()];
}

const dateTime = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });
const date = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
const day = new Intl.DateTimeFormat('en-BD', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatDateTime(iso: string): string {
	return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
	return date.format(new Date(iso));
}

/** `2026-10-17` (a calendar day, no time) → `17 Oct`. */
export function formatDay(ymd: string): string {
	return day.format(new Date(`${ymd}T00:00:00Z`));
}

export function formatPercent(bps: number): string {
	return `${bps / BPS_PER_PERCENT}%`;
}

/** Spreadsheet-safe CSV: quotes every cell and defuses leading =, +, -, @. */
export function toCsv(rows: (string | number)[][]): string {
	return rows
		.map((cells) =>
			cells
				.map((cell) => {
					const text = typeof cell === 'number' ? String(cell) : /^[=+\-@]/.test(cell) ? `'${cell}` : cell;
					return `"${text.replaceAll('"', '""')}"`;
				})
				.join(','),
		)
		.join('\r\n');
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
	const url = URL.createObjectURL(new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' }));
	const link = Object.assign(document.createElement('a'), { href: url, download: filename });
	link.click();
	URL.revokeObjectURL(url);
}
