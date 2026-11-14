// Reusable currency formatter
const LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB'
};

const SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

export function formatCurrency(amount: number | null | undefined, currencyCode: string = 'INR'): string {
  const locale = LOCALES[currencyCode] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default formatCurrency;

export function getCurrencySymbol(code: string = 'INR'): string {
  return SYMBOLS[code] ?? '₹';
}
