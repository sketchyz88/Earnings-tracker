/**
 * Shared number, currency, and date formatting.
 *
 * Every currency value in the app funnels through here so that thousands
 * separators, decimal places, and sign handling stay consistent. Formatters are
 * constructed once at module load — Intl.NumberFormat is expensive to build and
 * cheap to reuse.
 */

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const decimal = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toFiniteNumber(value) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** $28,244.05 */
export function formatCurrency(value) {
  return currency.format(toFiniteNumber(value));
}

/** $28,244 — for dense contexts where cents are noise. */
export function formatCurrencyWhole(value) {
  return currencyWhole.format(toFiniteNumber(value));
}

/**
 * $28.2K — for axis ticks and other tight spots. Falls back to whole dollars
 * below $10,000, where the compact form saves no space and reads worse.
 */
export function formatCompactCurrency(value) {
  const numeric = toFiniteNumber(value);
  if (Math.abs(numeric) < 10000) {
    return currencyWhole.format(numeric);
  }
  return compactCurrency.format(numeric);
}

/** +$1,204.06 / -$204.06 / $0.00 */
export function formatSignedCurrency(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === 0) {
    return currency.format(0);
  }
  return `${numeric > 0 ? '+' : '-'}${currency.format(Math.abs(numeric))}`;
}

/** +12.4% / -12.4% / 0.0% */
export function formatSignedPercent(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === 0) {
    return '0.0%';
  }
  return `${numeric > 0 ? '+' : '-'}${decimal.format(Math.abs(numeric))}%`;
}

/** 3.4x */
export function formatMultiplier(value) {
  const numeric = toFiniteNumber(value);
  if (numeric <= 0) {
    return '0.0x';
  }
  return `${decimal.format(numeric)}x`;
}

/** 8.3 — hours, always one decimal place. */
export function formatHours(value) {
  return decimal.format(toFiniteNumber(value));
}

/** 1,204 — plain counts with separators. */
export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(toFiniteNumber(value));
}
