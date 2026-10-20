/**
 * Per-shift money math, shared by every view so a shift's take-home is
 * computed the same way everywhere.
 */

export function getSales(shift) {
  return Number(shift?.sales) || 0;
}

export function getGrossTips(shift) {
  return Number(shift?.tips) || 0;
}

export function getHours(shift) {
  return Number(shift?.hours) || 0;
}

export function getTipOut(shift, settings) {
  return getSales(shift) * ((Number(settings?.tipOutRate) || 0) / 100);
}

export function getNetTips(shift, settings) {
  return getGrossTips(shift) - getTipOut(shift, settings);
}

export function getBasePay(shift, settings) {
  const explicit = Number(shift?.earnings);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return getHours(shift) * (Number(settings?.hourlyRate) || 0);
}

export function getTakeHome(shift, settings) {
  return getNetTips(shift, settings) + getBasePay(shift, settings);
}

/** Roll a list of shifts into totals plus the ratios servers actually care about. */
export function summarize(shifts, settings) {
  const totals = (shifts || []).reduce(
    (acc, shift) => {
      acc.shifts += 1;
      acc.hours += getHours(shift);
      acc.sales += getSales(shift);
      acc.tips += getGrossTips(shift);
      acc.tipOut += getTipOut(shift, settings);
      acc.basePay += getBasePay(shift, settings);
      return acc;
    },
    { shifts: 0, hours: 0, sales: 0, tips: 0, tipOut: 0, basePay: 0 }
  );

  const netTips = totals.tips - totals.tipOut;
  const takeHome = netTips + totals.basePay;

  return {
    ...totals,
    netTips,
    takeHome,
    perHour: totals.hours > 0 ? takeHome / totals.hours : 0,
    netTipsPerHour: totals.hours > 0 ? netTips / totals.hours : 0,
    perShift: totals.shifts > 0 ? takeHome / totals.shifts : 0,
    // Gross tips as a share of sales — the "how well did tables tip" number.
    tipPercent: totals.sales > 0 ? (totals.tips / totals.sales) * 100 : 0,
  };
}

/** "5:00 PM" from "17:00". Returns '' for anything unparseable. */
export function formatClock(value) {
  if (!value || !/^\d{1,2}:\d{2}/.test(value)) {
    return '';
  }
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatShiftTime(shift) {
  const start = formatClock(shift?.startTime);
  const end = formatClock(shift?.endTime);
  if (start && end) {
    return `${start} – ${end}`;
  }
  return start || end || '';
}

export function toDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
