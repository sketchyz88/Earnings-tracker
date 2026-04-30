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

export function getPeriodStart(date) {
  const normalizedDate = startOfDay(date);

  const periodStart = new Date(normalizedDate);
  if (normalizedDate.getDate() <= 15) {
    periodStart.setDate(1);
  } else {
    periodStart.setDate(16);
  }

  periodStart.setHours(0, 0, 0, 0);
  return periodStart;
}

export function getPeriodEnd(periodStart) {
  const periodEnd = new Date(periodStart);
  if (periodStart.getDate() === 1) {
    periodEnd.setDate(15);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
  }
  periodEnd.setHours(0, 0, 0, 0);
  return periodEnd;
}

export function buildPeriodSummary(periodStart, periodShifts, hourlyRate, tipOutRate) {
  const periodEnd = getPeriodEnd(periodStart);

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

export function getPeriods(shifts, hourlyRate, tipOutRate) {
  if (!shifts.length) {
    return [];
  }

  const sortedShifts = [...shifts].sort((left, right) => {
    return new Date(left.date) - new Date(right.date);
  });
  const groupedPeriods = new Map();

  sortedShifts.forEach((shift) => {
    const shiftDate = new Date(`${shift.date}T00:00:00`);
    const periodStart = getPeriodStart(shiftDate);
    const periodKey = getPeriodKey(periodStart);

    if (!groupedPeriods.has(periodKey)) {
      groupedPeriods.set(periodKey, []);
    }

    groupedPeriods.get(periodKey).push(shift);
  });

  return Array.from(groupedPeriods.entries())
    .map(([periodKey, periodShifts]) =>
      buildPeriodSummary(parsePeriodKey(periodKey), periodShifts, hourlyRate, tipOutRate)
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

function BiWeeklyHours({ isDarkMode = false, shifts, settings, onSelectPeriod }) {
  const periods = getPeriods(shifts || [], settings?.hourlyRate || 0, settings?.tipOutRate || 0);
  const hoursGoal = settings?.hoursGoal || 80;
  const tipGoal = settings?.tipGoal || 100;
  const todayPeriodStart = getPeriodStart(new Date());
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
    buildPeriodSummary(todayPeriodStart, [], settings?.hourlyRate || 0, settings?.tipOutRate || 0);
  const historicalPeriods = periods.filter((period) => period.key !== currentPeriod.key);
  const hoursProgress = Math.min(100, (currentPeriod.hours / hoursGoal) * 100);
  const tipsProgress = Math.min(100, (currentPeriod.netTips / tipGoal) * 100);

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
            <Heading size="md">Current pay period</Heading>
            <Text mt={1} color="gray.400">
              {currentPeriod.label}
            </Text>
          </Box>
          <Text color="gray.400" fontSize="sm">
            {currentPeriod.shifts} {currentPeriod.shifts === 1 ? 'shift' : 'shifts'} logged
          </Text>
        </Flex>

        <Text mb={4} color="gray.400" fontSize="sm">
          Tip-out is calculated at {settings?.tipOutRate || 0}% of total sales for each shift.
        </Text>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5} mb={6}>
          <Metric label="Hours" value={currentPeriod.hours.toFixed(1)} accent="#f6ad55" />
          <Metric label="Gross tips" value={`$${currentPeriod.tips.toFixed(2)}`} accent="#2563eb" />
          <Metric label="Tip-out" value={`$${currentPeriod.tipOut.toFixed(2)}`} accent="#fc8181" />
          <Metric label="Net tips" value={`$${currentPeriod.netTips.toFixed(2)}`} accent="#1e40af" />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={5} mb={6}>
          <Metric label="Sales" value={`$${currentPeriod.sales.toFixed(2)}`} accent="#fbd38d" />
          <Metric label="Base pay" value={`$${currentPeriod.basePay.toFixed(2)}`} accent="#7dd3fc" />
          <Metric
            label="Take-home"
            value={`$${currentPeriod.totalTakeHome.toFixed(2)}`}
            accent="#f687b3"
          />
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

      {historicalPeriods.length ? (
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
            {historicalPeriods
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
                    <Text fontWeight="semibold">{period.label}</Text>
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
