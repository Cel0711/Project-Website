import { DEFAULT_CURRENCY, type CurrencyCode } from '@coreloop/shared';

const BY_REGION: Record<string, CurrencyCode> = {
  PH: 'PHP',
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  SG: 'SGD',
  // euro area
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
};

/** A starting guess for the currency select, from the browser's language (en-PH -> PHP). The person can always change it. */
export function guessCurrency(): CurrencyCode {
  const lang = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || '';
  const region = lang.split('-')[1]?.toUpperCase() ?? '';
  return BY_REGION[region] ?? DEFAULT_CURRENCY;
}
