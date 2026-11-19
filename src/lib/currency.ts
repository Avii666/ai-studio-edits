export type CurrencyCode = 'LKR' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  label: string;
  symbol: string;
  name: string;
  flag: string;
  rateFromBase: number; // 1 Base (Rs. / LKR) = rate in target currency
  exchangeRateDescription: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  LKR: {
    code: 'LKR',
    label: 'LKR',
    symbol: 'Rs. ',
    name: 'Sri Lankan Rupee',
    flag: '🇱🇰',
    rateFromBase: 1,
    exchangeRateDescription: 'Base Currency (1 Rs. = 1 LKR)',
  },
  USD: {
    code: 'USD',
    label: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    rateFromBase: 1 / 300,
    exchangeRateDescription: '1 USD ≈ 300 Rs.',
  },
  EUR: {
    code: 'EUR',
    label: 'EUR',
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    rateFromBase: 1 / 330,
    exchangeRateDescription: '1 EUR ≈ 330 Rs.',
  },
  GBP: {
    code: 'GBP',
    label: 'GBP',
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    rateFromBase: 1 / 390,
    exchangeRateDescription: '1 GBP ≈ 390 Rs.',
  },
  INR: {
    code: 'INR',
    label: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    rateFromBase: 1 / 3.6,
    exchangeRateDescription: '1 INR ≈ 3.6 Rs.',
  },
  AED: {
    code: 'AED',
    label: 'AED',
    symbol: 'AED ',
    name: 'UAE Dirham',
    flag: '🇦🇪',
    rateFromBase: 1 / 82,
    exchangeRateDescription: '1 AED ≈ 82 Rs.',
  },
  AUD: {
    code: 'AUD',
    label: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    flag: '🇦🇺',
    rateFromBase: 1 / 195,
    exchangeRateDescription: '1 AUD ≈ 195 Rs.',
  },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export function formatCurrency(
  amountInRs: number,
  currencyCode: CurrencyCode = 'LKR',
  options?: { showApproxBase?: boolean; showCode?: boolean }
): string {
  if (amountInRs == null || isNaN(amountInRs)) return 'Rs. 0';

  const config = CURRENCIES[currencyCode] || CURRENCIES.LKR;
  const converted = amountInRs * config.rateFromBase;

  let formattedVal: string;
  if (currencyCode === 'LKR' || currencyCode === 'INR') {
    formattedVal = Math.round(converted).toLocaleString();
  } else {
    if (converted >= 100) {
      formattedVal = Math.round(converted).toLocaleString();
    } else {
      formattedVal = converted.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }

  const prefix = config.symbol;
  const suffix = options?.showCode ? ` ${config.code}` : '';
  const mainString = `${prefix}${formattedVal}${suffix}`;

  if (options?.showApproxBase && currencyCode !== 'LKR') {
    return `${mainString} (≈ Rs. ${Math.round(amountInRs).toLocaleString()})`;
  }

  return mainString;
}

export function convertFromBase(amountInRs: number, currencyCode: CurrencyCode): number {
  const config = CURRENCIES[currencyCode] || CURRENCIES.LKR;
  return amountInRs * config.rateFromBase;
}

export function convertToBase(amountInCurrency: number, currencyCode: CurrencyCode): number {
  const config = CURRENCIES[currencyCode] || CURRENCIES.LKR;
  return Math.round(amountInCurrency / config.rateFromBase);
}
