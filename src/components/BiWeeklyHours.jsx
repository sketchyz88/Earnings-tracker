import { Box, Heading, Text, SimpleGrid, Badge, Flex, Progress } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

  function getBiweeklyPeriods(shifts) {
    if (!shifts.length) return [];
  const sorted = [...shifts].sort((a, b) => new Date(a.date) - new Date(b.date));
  const periods = [];
  let i = 0;
  while (i < sorted.length) {
        const start = new Date(sorted[i].date);
        const end = new Date(start);
    end.setDate(end.getDate() + 13);
    const period = sorted.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
});
    const hours = period.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
    const tips = period.reduce((sum, s) => sum + (parseFloat(s.tips) || 0), 0);
    const earnings = period.reduce((sum, s) => sum + (parseFloat(s.earnings) || 0), 0);
    periods.push({
      label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      hours: parseFloat(hours.toFixed(1)),
      tips: parseFloat(tips.toFixed(2)),
      earnings: parseFloat(earnings.toFixed(2)),
      shifts: period.length,
});
    i += period.length;
    if (period.length === 0) break;
}
  return periods;
}

const BiWeeklyHours = ({ shifts, settings }) => {
  const periods = getBiweeklyPeriods(shifts || []);
  const goalHours = 80;

  if (!periods.length) {
    return <Box textAlign="center" py={10} color="gray.500"><Text>No data yet. Add some shifts first!</Text></Box>;
}

  const current = periods[periods.length - 1];
  const pct = Math.min(100, (current.hours / goalHours) * 100);

  return (
    <Box>
      <Box bg="white" rounded="lg" shadow="sm" border="1px" borderColor="gray.200" p={5} mb={4}>
        <Heading size="sm" mb={3}>Current Pay Period</Heading>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
          <Box><Text fontSize="xs" color="gray.500">Hours</Text><Text fontSize="xl" fontWeight="bold" color="teal.600">{current.hours}</Text></Box>
          <Box><Text fontSize="xs" color="gray.500">Tips</Text><Text fontSize="xl" fontWeight="bold" color="green.600">${current.tips}</Text></Box>
          <Box><Text fontSize="xs" color="gray.500">Total Earnings</Text><Text fontSize="xl" fontWeight="bold" color="blue.600">${current.earnings}</Text></Box>
          <Box><Text fontSize="xs" color="gray.500">Shifts</Text><Text fontSize="xl" fontWeight="bold">{current.shifts}</Text></Box>
        </SimpleGrid>
        <Box>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="xs" color="gray.500">Hours Progress ({current.hours}/{goalHours})</Text>
            <Text fontSize="xs" fontWeight="bold" color={pct >= 100 ? 'green.500' : 'teal.500'}>{pct.toFixed(0)}%</Text>
          </Flex>
          <Progress value={pct} colorScheme={pct >= 100 ? 'green' : 'teal'} rounded="full" size="sm" />
        </Box>
      </Box>

{periods.length > 1 && (
        <Box bg="white" rounded="lg" shadow="sm" border="1px" borderColor="gray.200" p={5}>
          <Heading size="sm" mb={4}>Hours by Pay Period</Heading>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={periods} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(v) => [v, 'Hours']} />
              <Bar dataKey="hours" fill="#38B2AC" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default BiWeeklyHours;
