import { useState } from 'react';
import { Box, SimpleGrid, VStack, HStack, Text, Badge, Card } from '@chakra-ui/react';
import { Calendar, Clock, DollarSign, Wallet } from 'lucide-react';
import PeriodDetailView from './PeriodDetailView';

const BASE_DATE = new Date(2026, 2, 6, 0, 0, 0, 0); // March 6, 2026 at midnight local time

const getPeriodNumber = (date) => {
  // Normalize both dates to start of day in local timezone
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const normalizedBase = new Date(2026, 2, 6, 0, 0, 0, 0); // March 6 at midnight
  
  const diffMs = normalizedDate.getTime() - normalizedBase.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const periodNum = Math.floor(diffDays / 14);
  
  return periodNum;
};

const getPeriodDates = (periodNumber) => {
  // Create start date by adding exact number of days to base date
  const start = new Date(2026, 2, 6, 0, 0, 0, 0); // March 6 midnight
  start.setDate(6 + (periodNumber * 14)); // Add days to the 6th
  
  // Create end date as 13 days after start
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 13, 0, 0, 0, 0);
  
  return [start, end];
};

const formatPeriodLabel = (startDate, endDate) => {
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const BiWeeklyHours = ({ shifts, onEdit, onDelete, hourlyWage = 17.80 }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Group shifts by 2-week periods
  const periodMap = shifts.reduce((acc, shift) => {
    if (!shift.shiftDate) return acc;
    
    const periodNum = getPeriodNumber(shift.shiftDate);
    if (!acc[periodNum]) {
      acc[periodNum] = { hours: 0, tips: 0, shiftCount: 0, deductions: 0, shifts: [] };
    }
    const hours = shift.hoursWorked || 0;
    acc[periodNum].hours += hours;
    acc[periodNum].tips += shift.tips || 0;
    acc[periodNum].shiftCount += 1;
    acc[periodNum].shifts.push({ name: shift.name, hours, tips: shift.tips }); // Debug info
    if (shift.totalSales) {
      acc[periodNum].deductions += shift.totalSales * 0.04;
    }
    return acc;
  }, {});

  // Debug: Log period calculations to console
  Object.entries(periodMap).forEach(([num, data]) => {
    const [startDate, endDate] = getPeriodDates(parseInt(num));
    console.log(`Period ${formatPeriodLabel(startDate, endDate)}:`, {
      totalHours: data.hours,
      totalTips: data.tips,
      shiftCount: data.shiftCount,
      calculatedWages: (data.hours * hourlyWage).toFixed(2),
      shifts: data.shifts
    });
  });

  // Get the current period number
  const currentPeriodNum = getPeriodNumber(new Date());

  // Convert to array, calculate wages, and sort
  const periods = Object.entries(periodMap)
    .map(([num, data]) => {
      const periodNum = parseInt(num);
      const [startDate, endDate] = getPeriodDates(periodNum);
      
      const wages = data.hours * hourlyWage;
      const totalPaycheck = data.tips + wages;
      
      return {
        periodNum,
        label: formatPeriodLabel(startDate, endDate),
        hours: data.hours,
        tips: data.tips,
        wages: wages,
        totalPaycheck: totalPaycheck,
        deductions: data.deductions,
        shiftCount: data.shiftCount,
        startDate,
        endDate
      };
    })
    .filter(p => p.shiftCount > 0) // Only show periods with shifts
    .sort((a, b) => b.periodNum - a.periodNum)
    .slice(0, 6);

  const handlePeriodClick = (period) => {
    setSelectedPeriod(period);
    setDetailOpen(true);
  };

  if (periods.length === 0) {
    return (
      <Box bg="gray.800" p={8} borderRadius="xl" textAlign="center" borderWidth="1px" borderColor="gray.700">
        <Text color="gray.400">No periods with shifts yet</Text>
      </Box>
    );
  }

  return (
    <>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
      {periods.map((period) => {
        const isCurrent = period.periodNum === currentPeriodNum;
        
        return (
          <Card.Root
            key={period.periodNum}
            bg={isCurrent ? "blue.900" : "gray.800"}
            borderRadius="lg"
            shadow="sm"
            borderWidth="1px"
            borderColor={isCurrent ? "blue.600" : "gray.700"}
            cursor="pointer"
            onClick={() => handlePeriodClick(period)}
            _hover={{
              shadow: "md",
              borderColor: isCurrent ? "blue.500" : "gray.600",
              transform: "translateY(-2px)",
              transition: "all 0.2s"
            }}
          >
            <Card.Body p={4}>
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between" align="center">
                  <HStack gap={2}>
                    <Calendar size={18} color={isCurrent ? "var(--chakra-colors-blue-400)" : "var(--chakra-colors-gray-300)"} />
                    <Text fontSize="md" fontWeight="600" color={isCurrent ? "blue.300" : "whiteAlpha.900"}>
                      {period.label}
                    </Text>
                  </HStack>
                  {isCurrent && <Badge colorPalette="blue" size="sm">Current</Badge>}
                </HStack>

                <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                  <VStack align="start" gap={1}>
                    <HStack gap={1}>
                      <DollarSign size={14} color={isCurrent ? "var(--chakra-colors-green-400)" : "var(--chakra-colors-gray-400)"} />
                      <Text fontSize="xs" color={isCurrent ? "blue.300" : "gray.400"}>Tips</Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="700" color="green.400">
                      ${Math.round(period.tips).toLocaleString()}
                    </Text>
                  </VStack>

                  {period.deductions > 0 && (
                    <VStack align="start" gap={1}>
                      <Text fontSize="xs" color={isCurrent ? "orange.300" : "orange.400"}>4% Tip Out</Text>
                      <Text fontSize="lg" fontWeight="700" color="orange.400">
                        -${Math.round(period.deductions).toLocaleString()}
                      </Text>
                    </VStack>
                  )}
                  
                  <VStack align="start" gap={1}>
                    <HStack gap={1}>
                      <Clock size={14} color={isCurrent ? "var(--chakra-colors-blue-400)" : "var(--chakra-colors-gray-400)"} />
                      <Text fontSize="xs" color={isCurrent ? "blue.300" : "gray.400"}>Wages</Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="700" color={isCurrent ? "blue.300" : "whiteAlpha.900"}>
                      ${Math.round(period.wages).toLocaleString()}
                    </Text>
                    <Text fontSize="2xs" color={isCurrent ? "blue.300" : "gray.500"}>
                      {Math.round(period.hours)}h @ ${hourlyWage.toFixed(2)}
                    </Text>
                  </VStack>

                  <VStack align="start" gap={1}>
                    <HStack gap={1}>
                      <Wallet size={14} color={isCurrent ? "var(--chakra-colors-green-400)" : "var(--chakra-colors-gray-400)"} />
                      <Text fontSize="xs" color={isCurrent ? "blue.300" : "gray.400"}>Total</Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="700" color="green.400">
                      ${Math.round(period.totalPaycheck).toLocaleString()}
                    </Text>
                  </VStack>
                </SimpleGrid>
                
                {period.deductions > 0 && (
                  <Box bg="orange.900" p={2} borderRadius="md" borderWidth="1px" borderColor="orange.700" mb={2}>
                    <HStack justify="space-between" fontSize="sm">
                      <Text color="orange.200">4% Tip Out Deducted:</Text>
                      <Text fontWeight="600" color="orange.300">-${period.deductions.toFixed(2)}</Text>
                    </HStack>
                  </Box>
                )}

                {period.deductions > 0 && (
                  <Box bg="blue.900" p={3} borderRadius="md" borderWidth="1px" borderColor="blue.700" mb={2}>
                    <HStack justify="space-between">
                      <VStack align="start" gap={0}>
                        <Text fontSize="xs" color="blue.200">Net Tips (After Tip Out)</Text>
                        <Text fontSize="lg" fontWeight="700" color="blue.300">
                          ${(period.tips - period.deductions).toFixed(2)}
                        </Text>
                      </VStack>
                      <VStack align="end" gap={0}>
                        <Text fontSize="xs" color="blue.200">Net Total Paycheck</Text>
                        <Text fontSize="lg" fontWeight="700" color="blue.300">
                          ${(period.totalPaycheck - period.deductions).toFixed(2)}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
                
                <Box borderTopWidth="1px" borderColor="gray.700" pt={2}>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color={isCurrent ? "blue.300" : "gray.400"}>
                      {period.shiftCount} shift{period.shiftCount !== 1 ? 's' : ''}
                    </Text>
                    <Badge colorPalette="gray" variant="subtle" size="xs">
                      Before Taxes
                    </Badge>
                  </HStack>
                </Box>
              </VStack>
            </Card.Body>
          </Card.Root>
        );
      })}
      </SimpleGrid>

      <PeriodDetailView
        period={selectedPeriod}
        shifts={shifts}
        open={detailOpen}
        onOpenChange={(e) => setDetailOpen(e.open)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
};

export default BiWeeklyHours;
