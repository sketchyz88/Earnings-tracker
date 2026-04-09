import { Box, VStack, HStack, Text, Dialog, Portal, Heading, Badge, SimpleGrid, Accordion } from '@chakra-ui/react';
import { Calendar, DollarSign, Clock, X } from 'lucide-react';
import ShiftCard from './ShiftCard';

const PeriodDetailView = ({ period, shifts, open, onOpenChange, onEdit, onDelete }) => {
  if (!period) return null;

  // Group shifts by date within this period
  const shiftsByDate = shifts
    .filter(s => {
      if (!s.shiftDate) return false;
      const shiftTime = s.shiftDate.getTime();
      const periodStart = period.startDate.getTime();
      const periodEnd = period.endDate.getTime() + (24 * 60 * 60 * 1000); // Include end date
      return shiftTime >= periodStart && shiftTime < periodEnd;
    })
    .reduce((acc, shift) => {
      const dateKey = shift.shiftDate.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: shift.shiftDate,
          shifts: [],
          totalTips: 0,
          totalHours: 0,
          totalDeductions: 0
        };
      }
      acc[dateKey].shifts.push(shift);
      acc[dateKey].totalTips += shift.tips || 0;
      acc[dateKey].totalHours += shift.hoursWorked || 0;
      if (shift.totalSales) {
        acc[dateKey].totalDeductions += shift.totalSales * 0.04;
      }
      return acc;
    }, {});

  const sortedDays = Object.values(shiftsByDate).sort((a, b) => b.date - a.date);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} size="xl">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.800" borderColor="gray.700" maxH="90vh" overflowY="auto">
            <Dialog.Header bg="gray.900" borderBottomWidth="1px" borderColor="gray.700">
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <Calendar size={20} color="var(--chakra-colors-blue-400)" />
                    <Heading size="md" color="blue.300">{period.label}</Heading>
                  </HStack>
                  <Dialog.CloseTrigger asChild>
                    <Box
                      as="button"
                      p={2}
                      borderRadius="md"
                      _hover={{ bg: 'gray.700' }}
                      color="gray.400"
                      cursor="pointer"
                    >
                      <X size={18} />
                    </Box>
                  </Dialog.CloseTrigger>
                </HStack>
                <SimpleGrid columns={3} gap={4}>
                  <VStack align="start" gap={0}>
                    <Text fontSize="xs" color="gray.400">Total Tips</Text>
                    <Text fontSize="lg" fontWeight="700" color="green.400">
                      ${Math.round(period.tips).toLocaleString()}
                    </Text>
                  </VStack>
                  <VStack align="start" gap={0}>
                    <Text fontSize="xs" color="gray.400">Total Hours</Text>
                    <Text fontSize="lg" fontWeight="700" color="blue.300">
                      {Math.round(period.hours)}h
                    </Text>
                  </VStack>
                  <VStack align="start" gap={0}>
                    <Text fontSize="xs" color="gray.400">Total Paycheck</Text>
                    <Text fontSize="lg" fontWeight="700" color="green.400">
                      ${Math.round(period.totalPaycheck).toLocaleString()}
                    </Text>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </Dialog.Header>

            <Dialog.Body p={4}>
              {sortedDays.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="gray.400">No shifts recorded in this period</Text>
                </Box>
              ) : (
                <Accordion.Root collapsible defaultValue={[sortedDays[0]?.date.toISOString().split('T')[0]]}>
                  {sortedDays.map((day) => {
                    const dateKey = day.date.toISOString().split('T')[0];
                    const dateLabel = day.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <Accordion.Item key={dateKey} value={dateKey}>
                        <Box
                          bg="gray.750"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="gray.700"
                          mb={3}
                          overflow="hidden"
                        >
                          <Accordion.ItemTrigger
                            p={3}
                            cursor="pointer"
                            _hover={{ bg: 'gray.700' }}
                            transition="all 0.2s"
                          >
                            <HStack justify="space-between" w="full">
                              <HStack gap={2}>
                                <Calendar size={16} color="var(--chakra-colors-gray-400)" />
                                <Text fontWeight="600" fontSize="sm" color="whiteAlpha.900">
                                  {dateLabel}
                                </Text>
                                <Badge colorPalette="gray" size="xs">
                                  {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
                                </Badge>
                              </HStack>

                              <HStack gap={4} fontSize="sm">
                                <HStack gap={1}>
                                  <DollarSign size={14} color="var(--chakra-colors-gray-400)" />
                                  <Text fontWeight="600" color="whiteAlpha.900">
                                    ${day.totalTips.toFixed(0)}
                                  </Text>
                                </HStack>
                                <HStack gap={1}>
                                  <Clock size={14} color="var(--chakra-colors-gray-400)" />
                                  <Text fontWeight="600" color="whiteAlpha.900">
                                    {day.totalHours.toFixed(1)}h
                                  </Text>
                                </HStack>
                              </HStack>

                              <Accordion.ItemIndicator />
                            </HStack>
                          </Accordion.ItemTrigger>

                          <Accordion.ItemContent>
                            <Box p={3} pt={0}>
                              <VStack gap={2} align="stretch">
                                {day.shifts.map(shift => (
                                  <ShiftCard key={shift.id} shift={shift} onEdit={onEdit} onDelete={onDelete} />
                                ))}
                              </VStack>
                            </Box>
                          </Accordion.ItemContent>
                        </Box>
                      </Accordion.Item>
                    );
                  })}
                </Accordion.Root>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default PeriodDetailView;
