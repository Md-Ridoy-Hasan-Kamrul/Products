import { z } from 'zod';

/** Accepts 01XXXXXXXXX, 8801XXXXXXXXX, or +880 1XXX-XXXXXX and returns 8801XXXXXXXXX. */
export const BdPhone = z
	.string()
	.transform((value) => value.replace(/\D/g, '').replace(/^0(?=1)/, '880'))
	.pipe(z.string().regex(/^8801[3-9]\d{8}$/, 'Enter a Bangladeshi mobile number, e.g. 01711000000'));

export const ShopName = z.string().trim().min(2).max(100);
