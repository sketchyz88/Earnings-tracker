import { Box, Badge, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function FloorComparison({ shifts, settings }) {
  const tipOutRate = (Number(settings?.tipOutRate) || 0) / 100;
  const floorMap = (shifts || []).reduce((accumulator, shift) => {
    const floorName = shift.floor || 'Unspecified';

    if (!accumulator[floorName]) {
      accumulator[floorName] = {
        floor: floorName,
        shifts: 0,
        hours: 0,
        tips: 0,
        basePay: 0,
      };
    }

    const hours = Number(shift.hours) || 0;
    const sales = Number(shift.sales) || 0;
    const tips = Number(shift.tips) || 0;
    const tipOut = sales * tipOutRate;
    const explicitBasePay = Number(shift.earnings);

    accumulator[floorName].shifts += 1;
    accumulator[floorName].hours += hours;
    accumulator[floorName].sales = (accumulator[floorName].sales || 0) + sales;
    accumulator[floorName].tips += tips;
    accumulator[floorName].tipOut = (accumulator[floorName].tipOut || 0) + tipOut;
    accumulator[floorName].basePay +=
      Number.isFinite(explicitBasePay) && explicitBasePay > 0
        ? explicitBasePay
        : hours * (settings?.hourlyRate || 0);

    return accumulator;
  }, {});

  const data = Object.values(floorMap)
    .map((floor) => ({
      ...floor,
      hours: Number(floor.hours.toFixed(1)),
      sales: Number((floor.sales || 0).toFixed(2)),
      tips: Number(floor.tips.toFixed(2)),
      tipOut: Number((floor.tipOut || 0).toFixed(2)),
      netTips: Number((floor.tips - (floor.tipOut || 0)).toFixed(2)),
      basePay: Number(floor.basePay.toFixed(2)),
      tipsPerHour: floor.hours > 0 ? Number(((floor.tips - (floor.tipOut || 0)) / floor.hours).toFixed(2)) : 0,
      takeHomePerShift:
        floor.shifts > 0 ? Number(((floor.tips - (floor.tipOut || 0) + floor.basePay) / floor.shifts).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.tipsPerHour - left.tipsPerHour);

  if (!data.length) {
    return (
      <Box
        textAlign="center"
        py={12}
        px={6}
        bg="#182133"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.100"
      >
        <Text fontSize="lg" fontWeight="semibold">
          No floor data yet
        </Text>
        <Text mt={2} color="gray.400">
          Add shifts with a floor or section and this view will compare where you earn best.
        </Text>
      </Box>
    );
  }

  return (
    <Box display="grid" gap={4}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
        {data.map((floor) => (
          <Box
            key={floor.floor}
            bg="#182133"
            borderRadius="2xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={5}
          >
            <Badge colorScheme="purple" borderRadius="full" px={3} py={1}>
              {floor.floor}
            </Badge>
            <Text mt={3} color="gray.400" fontSize="sm">
              {floor.shifts} {floor.shifts === 1 ? 'shift' : 'shifts'} • {floor.hours.toFixed(1)} hours
            </Text>
            <Text mt={3} fontSize="2xl" fontWeight="bold" color="green.300">
              ${floor.netTips.toFixed(2)}
            </Text>
            <Text color="gray.400" fontSize="sm">
              ${floor.tipOut.toFixed(2)} tip-out • ${floor.tipsPerHour.toFixed(2)}/hr net tips
            </Text>
            <Text mt={3} color="blue.200" fontSize="sm">
              ${floor.takeHomePerShift.toFixed(2)} average take-home per shift
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Box
        bg="#182133"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.100"
        p={{ base: 5, md: 6 }}
      >
        <Heading size="sm" mb={4}>
          Net tips per hour by floor
        </Heading>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="floor" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [`$${value}`, 'Tips / hour']}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
              }}
            />
            <Bar dataKey="tipsPerHour" fill="#9f7aea" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

export default FloorComparison;
