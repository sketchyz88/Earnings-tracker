import { Box, SimpleGrid, VStack, HStack, Text, Badge } from '@chakra-ui/react';
import { TrendingUp, DollarSign, Clock, Calendar } from 'lucide-react';

const FloorComparison = ({ shifts }) => {
  // Group shifts by floor
  const floorData = shifts.reduce((acc, shift) => {
    const floor = shift.section;
    if (floor !== 'Floor 1' && floor !== 'Floor 2') return acc;
    
    if (!acc[floor]) {
      acc[floor] = { tips: 0, hours: 0, shifts: 0 };
    }
    
    acc[floor].tips += shift.tips || 0;
    acc[floor].hours += shift.hoursWorked || 0;
    acc[floor].shifts += 1;
    
    return acc;
  }, {});

  const floor1 = floorData['Floor 1'] || { tips: 0, hours: 0, shifts: 0 };
  const floor2 = floorData['Floor 2'] || { tips: 0, hours: 0, shifts: 0 };

  const floor1TipPerHour = floor1.hours > 0 ? floor1.tips / floor1.hours : 0;
  const floor2TipPerHour = floor2.hours > 0 ? floor2.tips / floor2.hours : 0;

  const betterFloor = floor1TipPerHour > floor2TipPerHour ? 'Floor 1' : 
                      floor2TipPerHour > floor1TipPerHour ? 'Floor 2' : null;

  if (floor1.shifts === 0 && floor2.shifts === 0) {
    return (
      <Box bg="gray.800" p={8} borderRadius="xl" textAlign="center" borderWidth="1px" borderColor="gray.700">
        <Text color="gray.400">No floor data yet - start tracking shifts to see your floor comparison</Text>
      </Box>
    );
  }

  const FloorCard = ({ floorName, data, tipPerHour, isBetter }) => (
    <Box
      bg={isBetter ? "green.900" : "gray.800"}
      p={6}
      borderRadius="xl"
      borderWidth="2px"
      borderColor={isBetter ? "green.600" : "gray.700"}
      transition="all 0.2s"
      position="relative"
    >
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between">
          <Text fontSize="xl" fontWeight="700" color={isBetter ? "green.300" : "whiteAlpha.900"}>
            {floorName}
          </Text>
          {isBetter && (
            <Badge colorPalette="green" variant="solid" size="sm">
              <TrendingUp size={12} /> Best
            </Badge>
          )}
        </HStack>

        <SimpleGrid columns={2} gap={4}>
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <DollarSign size={16} color={isBetter ? "var(--chakra-colors-green-400)" : "var(--chakra-colors-gray-400)"} />
              <Text fontSize="xs" color={isBetter ? "green.300" : "gray.400"}>Total Tips</Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="700" color={isBetter ? "green.300" : "whiteAlpha.900"}>
              ${Math.round(data.tips).toLocaleString()}
            </Text>
          </VStack>

          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Clock size={16} color={isBetter ? "var(--chakra-colors-green-400)" : "var(--chakra-colors-gray-400)"} />
              <Text fontSize="xs" color={isBetter ? "green.300" : "gray.400"}>Total Hours</Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="700" color={isBetter ? "green.300" : "whiteAlpha.900"}>
              {Math.round(data.hours)}h
            </Text>
          </VStack>

          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <TrendingUp size={16} color={isBetter ? "var(--chakra-colors-green-400)" : "var(--chakra-colors-gray-400)"} />
              <Text fontSize="xs" color={isBetter ? "green.300" : "gray.400"}>Avg Tip/Hour</Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="700" color={isBetter ? "green.300" : "whiteAlpha.900"}>
              ${Math.round(tipPerHour)}
            </Text>
          </VStack>

          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Calendar size={16} color={isBetter ? "var(--chakra-colors-green-400)" : "var(--chakra-colors-gray-400)"} />
              <Text fontSize="xs" color={isBetter ? "green.300" : "gray.400"}>Shifts</Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="700" color={isBetter ? "green.300" : "whiteAlpha.900"}>
              {data.shifts}
            </Text>
          </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        <FloorCard 
          floorName="Floor 1" 
          data={floor1} 
          tipPerHour={floor1TipPerHour}
          isBetter={betterFloor === 'Floor 1'}
        />
        <FloorCard 
          floorName="Floor 2" 
          data={floor2} 
          tipPerHour={floor2TipPerHour}
          isBetter={betterFloor === 'Floor 2'}
        />
      </SimpleGrid>

      {betterFloor && (
        <Box mt={4} bg="gray.800" p={4} borderRadius="lg" textAlign="center" borderWidth="1px" borderColor="gray.700">
          <Text fontSize="sm" color="gray.300">
            💡 <Text as="span" fontWeight="600" color="whiteAlpha.900">{betterFloor}</Text> is earning you{' '}
            <Text as="span" fontWeight="600" color="green.400">
              ${Math.round(Math.abs(floor1TipPerHour - floor2TipPerHour))} more per hour
            </Text>{' '}
            on average
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FloorComparison;
