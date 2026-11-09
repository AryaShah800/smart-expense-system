// Reusable currency formatter
export function formatCurrency(amount?: number | null, currencyCode = 'INR'): string {
  const locales: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB'
  };
  const locale = locales[currencyCode] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default formatCurrency;

export function getCurrencySymbol(code = 'INR'): string {
  const map: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  return map[code] || map['INR'];
}
