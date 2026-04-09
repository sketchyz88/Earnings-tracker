import { useState } from 'react';
import { Box, Grid, VStack, HStack, Text, Badge, IconButton } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

const CalendarView = ({ shifts, onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // Group shifts by date
  const shiftsByDate = shifts.reduce((acc, shift) => {
    if (!shift.shiftDate) return acc;
    const dateKey = `${shift.shiftDate.getFullYear()}-${shift.shiftDate.getMonth()}-${shift.shiftDate.getDate()}`;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(shift);
    return acc;
  }, {});

  const getShiftsForDay = (day) => {
    const dateKey = `${year}-${month}-${day}`;
    return shiftsByDate[dateKey] || [];
  };

  const getTotalTipsForDay = (day) => {
    const dayShifts = getShiftsForDay(day);
    return dayShifts.reduce((sum, shift) => sum + (shift.tips || 0), 0);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Box>
      <VStack gap={4} mb={6} align="start">
        <HStack justify="space-between" w="full" flexWrap="wrap" gap={3}>
          <HStack gap={2}>
            <IconButton
              size="sm"
              variant="ghost"
              onClick={previousMonth}
              color="gray.400"
              _hover={{ bg: 'gray.800', color: 'whiteAlpha.900' }}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="whiteAlpha.900">
              {monthNames[month]} {year}
            </Text>
            <IconButton
              size="sm"
              variant="ghost"
              onClick={nextMonth}
              color="gray.400"
              _hover={{ bg: 'gray.800', color: 'whiteAlpha.900' }}
            >
              <ChevronRight size={20} />
            </IconButton>
          </HStack>
          <Text fontSize="sm" color="gray.400" display={{ base: 'none', md: 'block' }}>
            Click any day to view or add shifts
          </Text>
        </HStack>
      </VStack>

      <Grid templateColumns="repeat(7, 1fr)" gap={{ base: 1, md: 2 }}>
        {dayNames.map(day => (
          <Box key={day} p={{ base: 1, md: 2 }} textAlign="center">
            <Text fontSize={{ base: '2xs', md: 'xs' }} fontWeight="600" color="gray.500" textTransform="uppercase">
              {day}
            </Text>
          </Box>
        ))}

        {calendarDays.map((day, index) => {
          if (day === null) {
            return <Box key={`empty-${index}`} />;
          }

          const dayShifts = getShiftsForDay(day);
          const totalTips = getTotalTipsForDay(day);
          const hasShifts = dayShifts.length > 0;
          const isTodayDate = isToday(day);

          return (
            <Box
              key={day}
              bg={isTodayDate ? 'blue.900' : hasShifts ? 'gray.800' : 'gray.850'}
              borderWidth="2px"
              borderColor={isTodayDate ? 'blue.600' : hasShifts ? 'green.700' : 'gray.700'}
              borderRadius={{ base: 'md', md: 'lg' }}
              p={{ base: 2, md: 3 }}
              minH={{ base: '70px', md: '90px' }}
              aspectRatio={{ base: '1', md: 'auto' }}
              cursor="pointer"
              _hover={{ borderColor: isTodayDate ? 'blue.500' : 'green.600', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              onClick={() => {
                const clickedDate = new Date(year, month, day);
                onDayClick?.(clickedDate, dayShifts);
              }}
            >
              <VStack align="start" gap={{ base: 1, md: 2 }} h="full">
                <HStack justify="space-between" w="full">
                  <Text
                    fontSize={{ base: 'md', md: 'lg' }}
                    fontWeight="700"
                    color={isTodayDate ? 'blue.300' : hasShifts ? 'whiteAlpha.900' : 'gray.500'}
                  >
                    {day}
                  </Text>
                  {hasShifts && (
                    <Badge colorPalette="green" variant="solid" size="xs">
                      {dayShifts.length}
                    </Badge>
                  )}
                </HStack>

                {hasShifts && (
                  <HStack gap={1}>
                    <DollarSign size={{ base: 12, md: 14 }} color="var(--chakra-colors-green-400)" />
                    <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600" color="green.400">
                      ${Math.round(totalTips)}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
};

export default CalendarView;
