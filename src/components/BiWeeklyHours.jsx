import {
  Box,
  Flex,
  Heading,
  HStack,
  Progress,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

  const sortedShifts = [...shifts].sort((left, right) => {
    return new Date(left.date) - new Date(right.date);
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

function Metric({ label, value, accent = 'white' }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
        {label}
      </Text>
      <Text mt={1} fontSize="2xl" fontWeight="bold" color={accent}>
        {value}
      </Text>
    </Box>
  );
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatSignedCurrency(value) {
  if (!Number.isFinite(value) || value === 0) {
    return '$0.00';
  }

  return `${value > 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
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

  if (!periods.length) {
    return (
      <Box
        textAlign="center"
        py={12}
        px={6}
        bg={isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.9)'}
        borderRadius="3xl"
        border="1px solid"
        borderColor="rgba(22, 33, 43, 0.06)"
      >
        <Text fontSize="lg" fontWeight="semibold">
          No pay-period data yet
        </Text>
        <Text color="gray.400" mt={2}>
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
        bg={isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.9)'}
        borderRadius="3xl"
        border="1px solid"
        borderColor="rgba(22, 33, 43, 0.06)"
        p={{ base: 5, md: 6 }}
        boxShadow="0 18px 36px rgba(34, 46, 56, 0.06)"
      >
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} mb={5} direction={{ base: 'column', md: 'row' }}>
          <Box>
            <Heading size="md">Pay period performance</Heading>
            <Text mt={1} color="gray.400">
              {currentPeriod.label}
            </Text>
          </Box>
          <Text color="gray.400" fontSize="sm">
            {currentPeriod.shifts} {currentPeriod.shifts === 1 ? 'shift' : 'shifts'} logged
          </Text>
        </Flex>

        <Text mb={5} color="gray.400" fontSize="sm">
          Tip-out is calculated at {settings?.tipOutRate || 0}% of total sales for each shift, so
          this section focuses on whether the period is improving and whether you are pacing toward
          your goals.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
          <Box
            bg={isDarkMode ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.82)'}
            borderRadius="2xl"
            p={4}
            border="1px solid"
            borderColor="rgba(22, 33, 43, 0.06)"
          >
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Compare
            </Text>
            <Text mt={2} fontSize="2xl" fontWeight="bold" color={takeHomeDelta >= 0 ? '#68d391' : '#fc8181'}>
              {formatSignedCurrency(takeHomeDelta)}
            </Text>
            <Text mt={1} color="gray.400" fontSize="sm">
              {previousPeriod
                ? `Take-home vs ${previousPeriod.label}`
                : 'This becomes more useful once you have a previous pay period.'}
            </Text>
          </Box>

          <Box
            bg={isDarkMode ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.82)'}
            borderRadius="2xl"
            p={4}
            border="1px solid"
            borderColor="rgba(22, 33, 43, 0.06)"
          >
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Effective hourly
            </Text>
            <Text mt={2} fontSize="2xl" fontWeight="bold" color="#7dd3fc">
              {formatCurrency(effectiveHourly)}
            </Text>
            <Text mt={1} color="gray.400" fontSize="sm">
              Real take-home per hour for the period you are viewing.
            </Text>
          </Box>

          <Box
            bg={isDarkMode ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.82)'}
            borderRadius="2xl"
            p={4}
            border="1px solid"
            borderColor="rgba(22, 33, 43, 0.06)"
          >
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Avg shift take-home
            </Text>
            <Text mt={2} fontSize="2xl" fontWeight="bold" color="#f687b3">
              {formatCurrency(avgShiftTakeHome)}
            </Text>
            <Text mt={1} color="gray.400" fontSize="sm">
              {formatSignedCurrency(netTipsDelta)} net-tip change from the previous pay period.
            </Text>
          </Box>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5} mb={6}>
          <Metric label="Hours" value={currentPeriod.hours.toFixed(1)} accent="#f6ad55" />
          <Metric label="Sales" value={formatCurrency(currentPeriod.sales)} accent="#fbd38d" />
          <Metric label="Net tips" value={formatCurrency(currentPeriod.netTips)} accent="#2563eb" />
          <Metric label="Take-home" value={formatCurrency(currentPeriod.totalTakeHome)} accent="#68d391" />
        </SimpleGrid>

        <Box display="grid" gap={4}>
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" color="gray.400">
                Hours goal
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="orange.200">
                {currentPeriod.hours.toFixed(1)} / {hoursGoal}
              </Text>
            </Flex>
            <Progress value={hoursProgress} size="sm" rounded="full" colorScheme="orange" />
          </Box>

          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" color="gray.400">
                Net tip goal after tip-out
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="brand.700">
                ${currentPeriod.netTips.toFixed(0)} / ${tipGoal}
              </Text>
            </Flex>
            <Progress value={tipsProgress} size="sm" rounded="full" colorScheme="green" />
          </Box>
        </Box>
      </Box>

      {periods.length ? (
        <Box
          bg={isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.9)'}
          borderRadius="3xl"
          border="1px solid"
          borderColor="rgba(22, 33, 43, 0.06)"
          p={{ base: 5, md: 6 }}
          boxShadow="0 18px 36px rgba(34, 46, 56, 0.06)"
        >
          <Heading size="sm" mb={4}>
            Tip-out and net tip trend
          </Heading>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={periods} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                }}
              />
              <Bar dataKey="hours" fill="#f6ad55" radius={[6, 6, 0, 0]} />
              <Bar dataKey="tipOut" fill="#fc8181" radius={[6, 6, 0, 0]} />
              <Bar dataKey="netTips" fill="#68d391" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <Box mt={5} display="grid" gap={2}>
            <Heading size="xs" color="gray.400" textTransform="uppercase" letterSpacing="0.08em">
              Pay period history
            </Heading>
            {periods
              .slice()
              .reverse()
              .map((period) => (
                <Flex
                  key={period.key}
                  justify="space-between"
                  align={{ base: 'flex-start', md: 'center' }}
                  direction={{ base: 'column', md: 'row' }}
                  gap={3}
                  p={3}
                  borderRadius="xl"
                  bg={period.key === currentPeriod.key ? 'rgba(22, 33, 43, 0.04)' : 'transparent'}
                  border="1px solid"
                  borderColor="rgba(22, 33, 43, 0.06)"
                  cursor={onSelectPeriod ? 'pointer' : 'default'}
                  _hover={
                    onSelectPeriod
                      ? {
                          borderColor: 'brand.300',
                          bg: 'rgba(22, 33, 43, 0.03)',
                        }
                      : undefined
                  }
                  onClick={() => onSelectPeriod?.(period)}
                >
                  <Box>
                    <HStack spacing={2}>
                      <Text fontWeight="semibold">{period.label}</Text>
                      {period.key === currentPeriod.key ? (
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          textTransform="uppercase"
                          letterSpacing="0.08em"
                          color="brand.600"
                        >
                          Current
                        </Text>
                      ) : null}
                    </HStack>
                    <Text color="gray.400" fontSize="sm">
                      {period.shifts} {period.shifts === 1 ? 'shift' : 'shifts'} • Sales $
                      {period.sales.toFixed(2)}
                    </Text>
                  </Box>
                  <HStack spacing={4}>
                    <Text color="brand.700" fontSize="sm" fontWeight="semibold">
                      Net ${period.netTips.toFixed(2)}
                    </Text>
                    <Text color="red.200" fontSize="sm">
                      Tip-out ${period.tipOut.toFixed(2)}
                    </Text>
                  </HStack>
                </Flex>
              ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export default BiWeeklyHours;
