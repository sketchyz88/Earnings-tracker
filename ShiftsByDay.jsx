import { Accordion, Box, HStack, VStack, Text, Badge } from '@chakra-ui/react';
import { Calendar, DollarSign, Clock } from 'lucide-react';
import ShiftCard from './ShiftCard';

const ShiftsByDay = ({ shifts, onDelete, onEdit }) => {
  // Group shifts by date
  const shiftsByDate = shifts.reduce((acc, shift) => {
    if (!shift.shiftDate) return acc;
    
    const dateKey = shift.shiftDate.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: shift.shiftDate,
        shifts: [],
        totalTips: 0,
        totalHours: 0
      };
    }
    
    acc[dateKey].shifts.push(shift);
    acc[dateKey].totalTips += shift.tips || 0;
    acc[dateKey].totalHours += shift.hoursWorked || 0;
    
    return acc;
  }, {});

  // Convert to array and sort by date (newest first)
  const sortedDays = Object.values(shiftsByDate).sort((a, b) => b.date - a.date);

  const getDateLabel = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const isRecent = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toDateString();
    return dateStr === today.toDateString() || dateStr === yesterday.toDateString();
  };

  if (sortedDays.length === 0) {
    return (
      <Box bg="gray.800" p={8} borderRadius="xl" textAlign="center" borderWidth="1px" borderColor="gray.700">
        <Text color="gray.400">No shifts to display</Text>
      </Box>
    );
  }

  return (
    <Accordion.Root collapsible defaultValue={[sortedDays[0]?.date.toISOString().split('T')[0]]}>
      {sortedDays.map((day) => {
        const dateKey = day.date.toISOString().split('T')[0];
        const recent = isRecent(day.date);
        
        return (
          <Accordion.Item key={dateKey} value={dateKey}>
            <Box
              bg={recent ? "blue.900" : "gray.800"}
              borderRadius="xl"
              border="1px solid"
              borderColor={recent ? "blue.600" : "gray.700"}
              mb={3}
              overflow="hidden"
            >
              <Accordion.ItemTrigger
                p={4}
                cursor="pointer"
                _hover={{ bg: recent ? "blue.800" : "gray.750" }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" w="full">
                  <HStack gap={3}>
                    <Calendar size={20} color={recent ? "var(--chakra-colors-blue-400)" : "var(--chakra-colors-gray-300)"} />
                    <VStack align="start" gap={0}>
                      <HStack gap={2}>
                        <Text fontWeight="700" fontSize="md" color={recent ? "blue.300" : "whiteAlpha.900"}>
                          {getDateLabel(day.date)}
                        </Text>
                        {recent && (
                          <Badge colorPalette="blue" variant="solid" size="xs">
                            Recent
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" color={recent ? "blue.300" : "gray.400"}>
                        {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack gap={6} fontSize="sm">
                    <HStack gap={2}>
                      <DollarSign size={16} color={recent ? "var(--chakra-colors-blue-400)" : "var(--chakra-colors-gray-400)"} />
                      <Text fontWeight="600" color={recent ? "blue.300" : "whiteAlpha.900"}>
                        ${day.totalTips.toFixed(2)}
                      </Text>
                    </HStack>
                    <HStack gap={2}>
                      <Clock size={16} color={recent ? "var(--chakra-colors-blue-400)" : "var(--chakra-colors-gray-400)"} />
                      <Text fontWeight="600" color={recent ? "blue.300" : "whiteAlpha.900"}>
                        {day.totalHours.toFixed(1)}h
                      </Text>
                    </HStack>
                  </HStack>

                  <Accordion.ItemIndicator />
                </HStack>
              </Accordion.ItemTrigger>

              <Accordion.ItemContent>
                <Box p={4} pt={0}>
                  <VStack gap={3} align="stretch">
                    {day.shifts.map(shift => (
                      <ShiftCard key={shift.id} shift={shift} onDelete={onDelete} onEdit={onEdit} />
                    ))}
                  </VStack>
                </Box>
              </Accordion.ItemContent>
            </Box>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
};

export default ShiftsByDay;
