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

const PAY_PERIOD_LENGTH_DAYS = 14;
const PAY_PERIOD_ANCHOR = new Date('2026-03-06T00:00:00');

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function getPeriodStart(date) {
  const normalizedDate = startOfDay(date);
  const anchorDate = startOfDay(PAY_PERIOD_ANCHOR);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const dayDifference = Math.floor((normalizedDate - anchorDate) / millisecondsPerDay);
  const periodOffset = Math.floor(dayDifference / PAY_PERIOD_LENGTH_DAYS);
  const periodStart = new Date(anchorDate);
  periodStart.setDate(anchorDate.getDate() + periodOffset * PAY_PERIOD_LENGTH_DAYS);
  return periodStart;
}

export function buildPeriodSummary(periodStart, periodShifts, hourlyRate, tipOutRate) {
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + (PAY_PERIOD_LENGTH_DAYS - 1));

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
    key: periodStart.toISOString(),
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
    const periodKey = periodStart.toISOString();

    if (!groupedPeriods.has(periodKey)) {
      groupedPeriods.set(periodKey, []);
    }

    groupedPeriods.get(periodKey).push(shift);
  });

  return Array.from(groupedPeriods.entries()).map(([periodKey, periodShifts]) =>
    buildPeriodSummary(new Date(periodKey), periodShifts, hourlyRate, tipOutRate)
  );
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

function BiWeeklyHours({ shifts, settings, onSelectPeriod }) {
  const periods = getPeriods(shifts || [], settings?.hourlyRate || 0, settings?.tipOutRate || 0);
  const hoursGoal = settings?.hoursGoal || 80;
  const tipGoal = settings?.tipGoal || 100;
  const todayPeriodStart = getPeriodStart(new Date());
  const todayPeriodKey = todayPeriodStart.toISOString();

  if (!periods.length) {
    return (
      <Box
        textAlign="center"
        py={12}
        px={6}
        bg="rgba(12, 23, 34, 0.9)"
        borderRadius="3xl"
        border="1px solid"
        borderColor="rgba(188, 212, 198, 0.08)"
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
  const hoursProgress = Math.min(100, (currentPeriod.hours / hoursGoal) * 100);
  const tipsProgress = Math.min(100, (currentPeriod.netTips / tipGoal) * 100);

  return (
    <Box display="grid" gap={4}>
      <Box
        bg="rgba(12, 23, 34, 0.9)"
        borderRadius="3xl"
        border="1px solid"
        borderColor="rgba(188, 212, 198, 0.08)"
        p={{ base: 5, md: 6 }}
        boxShadow="0 20px 50px rgba(0,0,0,0.18)"
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
          <Metric label="Gross tips" value={`$${currentPeriod.tips.toFixed(2)}`} accent="#68d391" />
          <Metric label="Tip-out" value={`$${currentPeriod.tipOut.toFixed(2)}`} accent="#fc8181" />
          <Metric label="Net tips" value={`$${currentPeriod.netTips.toFixed(2)}`} accent="#9ae6b4" />
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
              <Text fontSize="sm" fontWeight="semibold" color="green.200">
                ${currentPeriod.netTips.toFixed(0)} / ${tipGoal}
              </Text>
            </Flex>
            <Progress value={tipsProgress} size="sm" rounded="full" colorScheme="green" />
          </Box>
        </Box>
      </Box>

      {periods.length > 1 ? (
        <Box
          bg="rgba(12, 23, 34, 0.9)"
          borderRadius="3xl"
          border="1px solid"
          borderColor="rgba(188, 212, 198, 0.08)"
          p={{ base: 5, md: 6 }}
          boxShadow="0 20px 50px rgba(0,0,0,0.18)"
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
                  bg={period.key === currentPeriod.key ? 'whiteAlpha.100' : 'transparent'}
                  border="1px solid"
                  borderColor="whiteAlpha.100"
                  cursor={onSelectPeriod ? 'pointer' : 'default'}
                  _hover={
                    onSelectPeriod
                      ? {
                          borderColor: 'teal.300',
                          bg: 'whiteAlpha.100',
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
                    <Text color="green.200" fontSize="sm" fontWeight="semibold">
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
