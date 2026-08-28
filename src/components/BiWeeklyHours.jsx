import { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatCompactCurrency,
  formatCurrency,
  formatHours,
  formatSignedCurrency,
} from '../utils/format';
import { ACCENTS, RADII, palette, series } from '../theme/tokens';

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export const DEFAULT_PAY_PERIOD_SETTINGS = {
  payPeriodLengthDays: 15,
  payPeriodAnchorDate: '2026-04-16',
};

function isValidDateInputValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export function normalizePayPeriodSettings(settings = {}) {
  const rawLength = Number(settings?.payPeriodLengthDays);
  const payPeriodLengthDays = Number.isFinite(rawLength)
    ? Math.max(1, Math.round(rawLength))
    : DEFAULT_PAY_PERIOD_SETTINGS.payPeriodLengthDays;

  const payPeriodAnchorDate = isValidDateInputValue(settings?.payPeriodAnchorDate)
    ? settings.payPeriodAnchorDate
    : DEFAULT_PAY_PERIOD_SETTINGS.payPeriodAnchorDate;

  return {
    payPeriodLengthDays,
    payPeriodAnchorDate,
  };
}

export function getPeriodKey(date) {
  const normalized = startOfDay(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parsePeriodKey(periodKey) {
  return new Date(`${periodKey}T00:00:00`);
}

export function getPeriodStart(date, settings) {
  const normalizedDate = startOfDay(date);
  const { payPeriodLengthDays, payPeriodAnchorDate } = normalizePayPeriodSettings(settings);
  const anchorDate = startOfDay(new Date(`${payPeriodAnchorDate}T00:00:00`));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((normalizedDate.getTime() - anchorDate.getTime()) / millisecondsPerDay);
  const cycleIndex = Math.floor(diffDays / payPeriodLengthDays);
  const periodStart = new Date(anchorDate);
  periodStart.setDate(periodStart.getDate() + cycleIndex * payPeriodLengthDays);
  return periodStart;
}

export function getPeriodEnd(periodStart, settings) {
  const { payPeriodLengthDays } = normalizePayPeriodSettings(settings);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + payPeriodLengthDays - 1);
  periodEnd.setHours(0, 0, 0, 0);
  return periodEnd;
}

export function buildPeriodSummary(periodStart, periodShifts, hourlyRate, tipOutRate, settings) {
  const periodEnd = getPeriodEnd(periodStart, settings);

  const hours = periodShifts.reduce((sum, shift) => sum + (Number(shift.hours) || 0), 0);
  const sales = periodShifts.reduce((sum, shift) => sum + (Number(shift.sales) || 0), 0);
  const tips = periodShifts.reduce((sum, shift) => sum + (Number(shift.tips) || 0), 0);
  const tipOut = sales * (tipOutRate / 100);
  const basePay = periodShifts.reduce((sum, shift) => {
    const explicit = Number(shift.earnings);
    if (Number.isFinite(explicit) && explicit > 0) {
      return sum + explicit;
    }
    return sum + (Number(shift.hours) || 0) * hourlyRate;
  }, 0);

  return {
    key: getPeriodKey(periodStart),
    label: `${periodStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${periodEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`,
    hours: Number(hours.toFixed(1)),
    sales: Number(sales.toFixed(2)),
    tips: Number(tips.toFixed(2)),
    tipOut: Number(tipOut.toFixed(2)),
    netTips: Number((tips - tipOut).toFixed(2)),
    basePay: Number(basePay.toFixed(2)),
    totalTakeHome: Number((tips - tipOut + basePay).toFixed(2)),
    shifts: periodShifts.length,
  };
}

export function getPeriods(shifts, hourlyRate, tipOutRate, settings) {
  if (!shifts.length) {
    return [];
  }

  // A shift with a missing or malformed date used to flow straight through
  // getPeriodStart -> getPeriodKey and produce a "NaN-NaN-NaN" key, which the
  // history list then rendered as "Invalid Date - Invalid Date". Drop those
  // rows here so one bad record can't manufacture a phantom pay period.
  const datedShifts = shifts.filter((shift) => isValidDateInputValue(shift?.date));

  if (!datedShifts.length) {
    return [];
  }

  const sortedShifts = [...datedShifts].sort((left, right) => {
    return new Date(`${left.date}T00:00:00`) - new Date(`${right.date}T00:00:00`);
  });
  const groupedPeriods = new Map();

  sortedShifts.forEach((shift) => {
    const shiftDate = new Date(`${shift.date}T00:00:00`);
    const periodStart = getPeriodStart(shiftDate, settings);
    const periodKey = getPeriodKey(periodStart);

    if (!groupedPeriods.has(periodKey)) {
      groupedPeriods.set(periodKey, []);
    }

    groupedPeriods.get(periodKey).push(shift);
  });

  return Array.from(groupedPeriods.entries())
    .map(([periodKey, periodShifts]) =>
      buildPeriodSummary(parsePeriodKey(periodKey), periodShifts, hourlyRate, tipOutRate, settings)
    )
    .sort((left, right) => parsePeriodKey(left.key) - parsePeriodKey(right.key));
}

function PerformanceTile({ isDarkMode, label, value, valueColor, helper, isFirst = false }) {
  const tokens = palette(isDarkMode);
  return (
    <Box
      px={{ base: 0, sm: isFirst ? 0 : 5 }}
      pr={{ base: 0, sm: 4 }}
      py={{ base: 3, sm: 0 }}
      borderLeft={{ base: 'none', sm: isFirst ? 'none' : '1px solid' }}
      borderTop={{ base: isFirst ? 'none' : '1px solid', sm: 'none' }}
      borderColor={tokens.border}
    >
      <Text
        fontSize="11px"
        color={tokens.textMuted}
        textTransform="uppercase"
        letterSpacing="0.08em"
        fontWeight={600}
      >
        {label}
      </Text>
      <Text
        mt={1.5}
        fontSize="26px"
        fontWeight={650}
        lineHeight="1.1"
        letterSpacing="-0.025em"
        color={valueColor || tokens.text}
        data-numeric
      >
        {value}
      </Text>
      <Text mt={1} color={tokens.textSubtle} fontSize="xs" lineHeight="1.5" data-numeric>
        {helper}
      </Text>
    </Box>
  );
}

function GoalMeter({ isDarkMode, label, current, target, progress, color }) {
  const tokens = palette(isDarkMode);
  return (
    <Box>
      <Flex justify="space-between" align="baseline" mb={2}>
        <Text fontSize="13px" color={tokens.textMuted}>
          {label}
        </Text>
        <Text fontSize="13px" fontWeight={600} color={tokens.text} data-numeric>
          {current}{' '}
          <Box as="span" color={tokens.textSubtle} fontWeight={400}>
            / {target}
          </Box>
        </Text>
      </Flex>
      <Box height="6px" borderRadius="full" bg={tokens.surfaceSunken} overflow="hidden">
        <Box
          height="100%"
          width={`${Math.max(0, Math.min(100, progress))}%`}
          bg={color}
          borderRadius="full"
          transition="width 320ms cubic-bezier(0.4, 0, 0.2, 1)"
        />
      </Box>
    </Box>
  );
}


const HISTORY_PAGE_SIZE = 6;

function PeriodTooltip({ active, payload, label, isDarkMode }) {
  if (!active || !payload?.length) {
    return null;
  }

  const tokens = palette(isDarkMode);
  const byKey = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry]));
  const netTips = byKey.netTips?.value ?? 0;
  const tipOut = byKey.tipOut?.value ?? 0;

  return (
    <Box
      bg={tokens.surfaceRaised}
      border="1px solid"
      borderColor={tokens.borderStrong}
      borderRadius={RADII.md}
      boxShadow={tokens.shadowRaised}
      px={3}
      py={2.5}
      minW="180px"
    >
      <Text fontSize="xs" fontWeight={600} color={tokens.text} data-numeric>
        {label}
      </Text>
      <Box mt={2} display="grid" gap={1.5}>
        {payload.map((entry) => (
          <Flex key={entry.dataKey} justify="space-between" align="center" gap={4}>
            <HStack spacing={2}>
              <Box boxSize="8px" borderRadius="full" bg={entry.color} flexShrink={0} />
              <Text fontSize="xs" color={tokens.textMuted}>
                {entry.name}
              </Text>
            </HStack>
            <Text fontSize="xs" fontWeight={600} color={tokens.text} data-numeric>
              {formatCurrency(entry.value)}
            </Text>
          </Flex>
        ))}
        <Flex
          justify="space-between"
          align="center"
          gap={4}
          pt={1.5}
          borderTop="1px solid"
          borderColor={tokens.border}
        >
          <Text fontSize="xs" color={tokens.textMuted}>
            Gross tips
          </Text>
          <Text fontSize="xs" fontWeight={600} color={tokens.text} data-numeric>
            {formatCurrency(netTips + tipOut)}
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}

function BiWeeklyHours({ isDarkMode = false, shifts, settings, onSelectPeriod }) {
  const periods = getPeriods(
    shifts || [],
    settings?.hourlyRate || 0,
    settings?.tipOutRate || 0,
    settings
  );
  const hoursGoal = settings?.hoursGoal || 80;
  const tipGoal = settings?.tipGoal || 100;
  const todayPeriodStart = getPeriodStart(new Date(), settings);
  const todayPeriodKey = getPeriodKey(todayPeriodStart);
  const tokens = palette(isDarkMode);
  const seriesColors = series(isDarkMode);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Chronological for the chart; newest-first for the history list.
  const chartData = periods;
  const orderedPeriods = [...periods].reverse();
  const visiblePeriods = showAllHistory
    ? orderedPeriods
    : orderedPeriods.slice(0, HISTORY_PAGE_SIZE);
  const averageNetTips = periods.length
    ? periods.reduce((sum, period) => sum + period.netTips, 0) / periods.length
    : 0;

  if (!periods.length) {
    return (
      <Box
        textAlign="center"
        py={12}
        px={6}
        bg={tokens.surface}
        borderRadius={RADII.xl}
        border="1px solid"
        borderColor={tokens.border}
      >
        <Text fontSize="lg" fontWeight={600} color={tokens.text}>
          No pay-period data yet
        </Text>
        <Text color={tokens.textMuted} mt={2} fontSize="sm">
          Add a few shifts and this view will track your hours, tip-out, and take-home by pay period.
        </Text>
      </Box>
    );
  }

  const currentPeriod =
    periods.find((period) => period.key === todayPeriodKey) ||
    buildPeriodSummary(
      todayPeriodStart,
      [],
      settings?.hourlyRate || 0,
      settings?.tipOutRate || 0,
      settings
    );
  const currentPeriodIndex = periods.findIndex((period) => period.key === currentPeriod.key);
  const previousPeriod = currentPeriodIndex > 0 ? periods[currentPeriodIndex - 1] : null;
  const hoursProgress = Math.min(100, (currentPeriod.hours / hoursGoal) * 100);
  const tipsProgress = Math.min(100, (currentPeriod.netTips / tipGoal) * 100);
  const effectiveHourly =
    currentPeriod.hours > 0 ? currentPeriod.totalTakeHome / currentPeriod.hours : 0;
  const avgShiftTakeHome =
    currentPeriod.shifts > 0 ? currentPeriod.totalTakeHome / currentPeriod.shifts : 0;
  const takeHomeDelta = previousPeriod
    ? currentPeriod.totalTakeHome - previousPeriod.totalTakeHome
    : 0;
  const netTipsDelta = previousPeriod ? currentPeriod.netTips - previousPeriod.netTips : 0;

  return (
    <Box display="grid" gap={4}>
      <Box
        bg={tokens.surface}
        backdropFilter="blur(12px)"
        borderRadius={RADII.xl}
        border="1px solid"
        borderColor={tokens.border}
        p={{ base: 5, md: 6 }}
        boxShadow={tokens.shadow}
      >
        <Flex
          justify="space-between"
          align={{ base: 'flex-start', md: 'baseline' }}
          gap={4}
          mb={5}
          direction={{ base: 'column', md: 'row' }}
        >
          <Box>
            <Heading size="md" letterSpacing="-0.02em">
              Pay period performance
            </Heading>
            <Text mt={1} color={tokens.textMuted} fontSize="sm" data-numeric>
              {currentPeriod.label} · tip-out at {settings?.tipOutRate || 0}% of sales
            </Text>
          </Box>
          <Text color={tokens.textSubtle} fontSize="sm" data-numeric>
            {currentPeriod.shifts} {currentPeriod.shifts === 1 ? 'shift' : 'shifts'} logged
          </Text>
        </Flex>

        {/*
          Effective hourly, sales, hours and take-home already headline the
          dashboard hero. This section only carries what is specific to it:
          movement against the previous period, per-shift average, and pacing
          against the goals.

          With no shifts logged, every one of those is $0.00 — a block of zeros
          that says nothing. Point at the trend below instead.
        */}
        {currentPeriod.shifts === 0 ? (
          <Box
            py={7}
            px={5}
            textAlign="center"
            borderRadius={RADII.md}
            border="1px dashed"
            borderColor={tokens.border}
            bg={tokens.surfaceSunken}
          >
            <Text fontSize="sm" fontWeight={600} color={tokens.text}>
              Nothing logged in this period yet
            </Text>
            <Text mt={1} fontSize="13px" color={tokens.textMuted} maxW="46ch" mx="auto">
              Comparisons and goal pacing start once the first shift lands. Your
              history is unaffected — the trend below still covers every saved period.
            </Text>
          </Box>
        ) : (
        <>
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={0} mb={6}>
          <PerformanceTile
            isDarkMode={isDarkMode}
            label={previousPeriod ? 'vs previous period' : 'Change'}
            value={formatSignedCurrency(takeHomeDelta)}
            valueColor={
              takeHomeDelta === 0
                ? tokens.text
                : takeHomeDelta > 0
                  ? ACCENTS.positive
                  : ACCENTS.negative
            }
            helper={
              previousPeriod
                ? `Take-home against ${previousPeriod.label}`
                : 'Log a second pay period to unlock this comparison.'
            }
            isFirst
          />
          <PerformanceTile
            isDarkMode={isDarkMode}
            label="Avg shift take-home"
            value={formatCurrency(avgShiftTakeHome)}
            helper={`${formatSignedCurrency(netTipsDelta)} net-tip change from the previous period.`}
          />
          <PerformanceTile
            isDarkMode={isDarkMode}
            label="Net tips this period"
            value={formatCurrency(currentPeriod.netTips)}
            helper={`${formatCurrency(currentPeriod.tipOut)} went out in tip-out.`}
          />
        </SimpleGrid>

        <Box display="grid" gap={4}>
          <GoalMeter
            isDarkMode={isDarkMode}
            label="Hours"
            current={formatHours(currentPeriod.hours)}
            target={formatHours(hoursGoal)}
            progress={hoursProgress}
            color={ACCENTS.warning}
          />
          <GoalMeter
            isDarkMode={isDarkMode}
            label="Net tips after tip-out"
            current={formatCurrency(currentPeriod.netTips)}
            target={formatCurrency(tipGoal)}
            progress={tipsProgress}
            color={ACCENTS.primary}
          />
        </Box>
        </>
        )}
      </Box>

      {periods.length ? (
        <Box
          bg={tokens.surface}
          backdropFilter="blur(12px)"
          borderRadius={RADII.xl}
          border="1px solid"
          borderColor={tokens.border}
          p={{ base: 5, md: 6 }}
          boxShadow={tokens.shadow}
        >
          <Flex justify="space-between" align="baseline" gap={4} mb={1} wrap="wrap">
            <Heading size="sm" letterSpacing="-0.02em">
              Gross tips by pay period
            </Heading>
            <Text color={tokens.textSubtle} fontSize="xs" data-numeric>
              Avg net {formatCurrency(averageNetTips)} per period
            </Text>
          </Flex>
          <Text color={tokens.textMuted} fontSize="13px" mb={4}>
            Each bar is one period&rsquo;s gross tips, split into what you kept and what
            went to tip-out.
          </Text>

          {/*
            Hours used to be plotted here alongside dollars. On a single axis a
            60-hour bar is invisible next to a $2,600 bar, so the series was
            noise; hours now live in the progress meters above, where they have
            their own scale.
          */}
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="netTipsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors.netTips} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={seriesColors.netTips} stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="tipOutFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={seriesColors.tipOut} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={seriesColors.tipOut} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              {/* Horizontal rules only — vertical gridlines add nothing over a
                  categorical axis and busy up the plot. */}
              <CartesianGrid
                vertical={false}
                stroke={tokens.grid}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: tokens.textSubtle, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: tokens.grid }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: tokens.textSubtle, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip
                cursor={{ fill: tokens.grid }}
                content={<PeriodTooltip isDarkMode={isDarkMode} />}
              />
              <Legend
                verticalAlign="top"
                align="left"
                height={32}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: tokens.textMuted, fontSize: 12 }}>{value}</span>
                )}
              />
              {averageNetTips > 0 ? (
                <ReferenceLine
                  y={averageNetTips}
                  stroke={tokens.textSubtle}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                />
              ) : null}
              {/* Stacked: net + tip-out sums to gross tips. The 2px stroke in the
                  surface color keeps the two segments from fusing visually. */}
              <Bar
                dataKey="netTips"
                name="Net tips"
                stackId="tips"
                fill="url(#netTipsFill)"
                stroke={tokens.canvas}
                strokeWidth={2}
              />
              <Bar
                dataKey="tipOut"
                name="Tip-out"
                stackId="tips"
                fill="url(#tipOutFill)"
                stroke={tokens.canvas}
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          <Box mt={6}>
            <Flex justify="space-between" align="baseline" mb={3}>
              <Heading
                size="xs"
                color={tokens.textMuted}
                textTransform="uppercase"
                letterSpacing="0.08em"
                fontSize="11px"
              >
                Pay period history
              </Heading>
              <Text color={tokens.textSubtle} fontSize="xs" data-numeric>
                {orderedPeriods.length} periods
              </Text>
            </Flex>

            <Box display="grid" gap="1px" bg={tokens.border} borderRadius={RADII.md} overflow="hidden">
              {visiblePeriods.map((period) => {
                const isCurrent = period.key === currentPeriod.key;
                return (
                  <Flex
                    key={period.key}
                    justify="space-between"
                    align={{ base: 'flex-start', sm: 'center' }}
                    direction={{ base: 'column', sm: 'row' }}
                    gap={2}
                    px={4}
                    py={3}
                    bg={isCurrent ? tokens.surfaceRaised : tokens.surfaceSunken}
                    cursor={onSelectPeriod ? 'pointer' : 'default'}
                    transition="background-color 120ms ease"
                    _hover={onSelectPeriod ? { bg: tokens.surfaceRaised } : undefined}
                    onClick={() => onSelectPeriod?.(period)}
                  >
                    <Box minW={0}>
                      <HStack spacing={2}>
                        <Text fontWeight={600} fontSize="sm" color={tokens.text} data-numeric>
                          {period.label}
                        </Text>
                        {isCurrent ? (
                          <Box
                            as="span"
                            fontSize="10px"
                            fontWeight={600}
                            textTransform="uppercase"
                            letterSpacing="0.06em"
                            color={ACCENTS.primary}
                            bg={ACCENTS.primaryMuted}
                            borderRadius={RADII.sm}
                            px={1.5}
                            py={0.5}
                          >
                            Current
                          </Box>
                        ) : null}
                      </HStack>
                      <Text color={tokens.textSubtle} fontSize="xs" mt={0.5} data-numeric>
                        {period.shifts} {period.shifts === 1 ? 'shift' : 'shifts'} •{' '}
                        {formatCurrency(period.sales)} sales
                      </Text>
                    </Box>
                    <HStack spacing={5} flexShrink={0}>
                      <Text fontSize="sm" fontWeight={600} color={tokens.text} data-numeric>
                        {formatCurrency(period.netTips)}
                      </Text>
                      <Text
                        fontSize="xs"
                        color={tokens.textSubtle}
                        minW="72px"
                        textAlign="right"
                        data-numeric
                      >
                        −{formatCurrency(period.tipOut)}
                      </Text>
                    </HStack>
                  </Flex>
                );
              })}
            </Box>

            {orderedPeriods.length > HISTORY_PAGE_SIZE ? (
              <Button
                mt={3}
                size="sm"
                variant="ghost"
                width="100%"
                color={tokens.textMuted}
                fontWeight={500}
                onClick={() => setShowAllHistory((previous) => !previous)}
              >
                {showAllHistory
                  ? 'Show less'
                  : `Show all ${orderedPeriods.length} periods`}
              </Button>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export default BiWeeklyHours;
