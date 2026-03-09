export const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    JPY: '¥'
  };

  return symbols[currencyCode] || '₹'; // Default to INR if not found
};

export const formatAmount = (amount, currencyCode) => {
  const symbol = getCurrencySymbol(currencyCode);
  // Add commas to large numbers (e.g., 10,000)
  const formattedNumber = Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  return `${symbol} ${formattedNumber}`;
};