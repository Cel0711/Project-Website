/**
 * Currencies a client can choose. Every quote and invoice stores its own code, and amounts in different
 * currencies are never added together (dashboards show one currency at a time).
 */
export const CURRENCIES = [
  { code: 'PHP', name: 'Philippine peso', symbol: '₱' },
  { code: 'USD', name: 'US dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British pound', symbol: '£' },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];
export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]];
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === 'string' && (CURRENCY_CODES as string[]).includes(v);
}

/** "₱1,234.50". Amounts travel as strings with two decimals; this is display only. */
export function formatMoney(amount: string | number, currency: string): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const v = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}
