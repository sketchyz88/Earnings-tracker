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

/**
 * Tables served on a shift: [{ id, table, sales, tip }].
 * Table "names" are free text ("12", "B4", "Bar 3"); they're compared
 * case-insensitively with whitespace trimmed so "b4" and "B4 " are one table.
 */
export function normalizeTableName(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function getTables(shift) {
  if (!Array.isArray(shift?.tables)) {
    return [];
  }
  return shift.tables
    .map((entry) => ({
      id: entry?.id || '',
      table: normalizeTableName(entry?.table),
      sales: Number(entry?.sales) || 0,
      tip: Number(entry?.tip) || 0,
    }))
    .filter((entry) => entry.table);
}

function naturalCompare(left, right) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

/** Table names in a shift's section, in natural order (36, 37, 39A). */
export function getSectionTables(shift) {
  return [...new Set(getTables(shift).map((entry) => entry.table))].sort(naturalCompare);
}

export function formatSection(names) {
  return names.join(' · ');
}

/**
 * Compare sections and tables using shift totals.
 *
 * Servers know the shift's tips, not each table's, so a table's number is the
 * average of every shift where it was in your section. The baseline is the
 * same average across all shifts that had a section logged, so "+$6/hr"
 * means "nights with this table beat your typical sectioned night".
 */
export function analyzeSections(shifts, settings) {
  const sectioned = (shifts || []).filter((shift) => getSectionTables(shift).length);
  const baseline = summarize(sectioned, settings);

  const sectionMap = new Map();
  const tableMap = new Map();
  sectioned.forEach((shift) => {
    const names = getSectionTables(shift);
    const key = names.join('|');
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { names, shifts: [] });
    }
    sectionMap.get(key).shifts.push(shift);
    names.forEach((name) => {
      if (!tableMap.has(name)) {
        tableMap.set(name, []);
      }
      tableMap.get(name).push(shift);
    });
  });

  // Anything seen on 3+ shifts ranks above early reads, so one lucky night
  // can't top the list.
  const tier = (row) => (row.stats.shifts >= 3 ? 1 : 0);
  const byPerHour = (left, right) =>
    tier(right) - tier(left) ||
    right.stats.perHour - left.stats.perHour ||
    right.stats.shifts - left.stats.shifts;

  const sections = Array.from(sectionMap.values())
    .map(({ names, shifts: sectionShifts }) => {
      const stats = summarize(sectionShifts, settings);
      return { key: names.join('|'), name: formatSection(names), names, stats, delta: stats.perHour - baseline.perHour };
    })
    .sort(byPerHour);

  const tables = Array.from(tableMap.entries())
    .map(([name, tableShifts]) => {
      const stats = summarize(tableShifts, settings);
      return { key: name, name, stats, delta: stats.perHour - baseline.perHour };
    })
    .sort(byPerHour);

  return { baseline, sections, tables, sectionedShifts: sectioned.length };
}
