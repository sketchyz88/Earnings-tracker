import { useMemo, useState } from 'react';
import { Box, Badge, FormControl, FormLabel, Heading, Input, Select, SimpleGrid, Text } from '@chakra-ui/react';
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

function getDateRangeLabel(days) {
  return `Last ${days} day${days === 1 ? '' : 's'}`;
}

function FloorComparison({ shifts, settings }) {
  const [rangePreset, setRangePreset] = useState('14');
  const [customDays, setCustomDays] = useState('30');

  const selectedDays = useMemo(() => {
    if (rangePreset === 'custom') {
      const parsed = Number(customDays);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    }

    return Number(rangePreset) || 14;
  }, [customDays, rangePreset]);

  const filteredShifts = useMemo(() => {
    const allShifts = shifts || [];
    if (!allShifts.length) {
      return [];
    }

    const today = startOfDay(new Date());
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (selectedDays - 1));

    return allShifts.filter((shift) => {
      if (!shift?.date) {
        return false;
      }

      const shiftDate = startOfDay(new Date(`${shift.date}T00:00:00`));
      return shiftDate >= rangeStart && shiftDate <= today;
    });
  }, [selectedDays, shifts]);

  const tipOutRate = (Number(settings?.tipOutRate) || 0) / 100;
  const floorMap = filteredShifts.reduce((accumulator, shift) => {
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
      <Box display="grid" gap={4}>
        <Box
          bg="#182133"
          borderRadius="2xl"
          border="1px solid"
          borderColor="whiteAlpha.100"
          p={{ base: 5, md: 6 }}
        >
          <SimpleGrid columns={{ base: 1, md: rangePreset === 'custom' ? 2 : 1 }} spacing={4}>
            <FormControl maxW={{ md: '260px' }}>
              <FormLabel color="gray.300">Date range</FormLabel>
              <Select value={rangePreset} onChange={(event) => setRangePreset(event.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="10">Last 10 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom">Custom days</option>
              </Select>
            </FormControl>
            {rangePreset === 'custom' ? (
              <FormControl maxW={{ md: '220px' }}>
                <FormLabel color="gray.300">Custom days</FormLabel>
                <Input
                  type="number"
                  min={1}
                  value={customDays}
                  onChange={(event) => setCustomDays(event.target.value)}
                  placeholder="30"
                />
              </FormControl>
            ) : null}
          </SimpleGrid>
        </Box>

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
            No floor data for {getDateRangeLabel(selectedDays).toLowerCase()}
          </Text>
          <Text mt={2} color="gray.400">
            Add shifts with a floor or widen the date range to compare where you earn best.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box display="grid" gap={4}>
      <Box
        bg="#182133"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.100"
        p={{ base: 5, md: 6 }}
      >
        <SimpleGrid columns={{ base: 1, md: rangePreset === 'custom' ? 2 : 1 }} spacing={4}>
          <FormControl maxW={{ md: '260px' }}>
            <FormLabel color="gray.300">Date range</FormLabel>
            <Select value={rangePreset} onChange={(event) => setRangePreset(event.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="10">Last 10 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="custom">Custom days</option>
            </Select>
          </FormControl>
          {rangePreset === 'custom' ? (
            <FormControl maxW={{ md: '220px' }}>
              <FormLabel color="gray.300">Custom days</FormLabel>
              <Input
                type="number"
                min={1}
                value={customDays}
                onChange={(event) => setCustomDays(event.target.value)}
                placeholder="30"
              />
            </FormControl>
          ) : null}
        </SimpleGrid>
        <Text mt={3} color="gray.400" fontSize="sm">
          Showing floor results for {getDateRangeLabel(selectedDays).toLowerCase()}.
        </Text>
      </Box>

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
