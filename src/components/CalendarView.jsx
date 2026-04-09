import { useMemo, useState } from 'react';
import { Badge, Box, Grid, GridItem, Heading, IconButton, Text, Flex } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function CalendarView({ shifts, selectedDate, onDateClick }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const shiftMap = useMemo(() => {
    return (shifts || []).reduce((accumulator, shift) => {
      const dateKey = shift.date;
      if (!accumulator[dateKey]) {
        accumulator[dateKey] = [];
      }
      accumulator[dateKey].push(shift);
      return accumulator;
    }, {});
  }, [shifts]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function showPreviousMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((currentYear) => currentYear - 1);
      return;
    }
    setMonth((currentMonth) => currentMonth - 1);
  }

  function showNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((currentYear) => currentYear + 1);
      return;
    }
    setMonth((currentMonth) => currentMonth + 1);
  }

  const cells = [];
  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  return (
    <Box
      bg="#182133"
      borderRadius="2xl"
      border="1px solid"
      borderColor="whiteAlpha.100"
      p={{ base: 5, md: 6 }}
    >
      <Flex align="center" justify="space-between" mb={5}>
        <IconButton
          icon={<ChevronLeft size={18} />}
          onClick={showPreviousMonth}
          variant="ghost"
          color="gray.300"
          aria-label="Previous month"
        />
        <Heading size="md">
          {MONTHS[month]} {year}
        </Heading>
        <IconButton
          icon={<ChevronRight size={18} />}
          onClick={showNextMonth}
          variant="ghost"
          color="gray.300"
          aria-label="Next month"
        />
      </Flex>

      <Grid templateColumns="repeat(7, 1fr)" gap={2}>
        {DAYS.map((day) => (
          <GridItem key={day}>
            <Text textAlign="center" fontSize="xs" color="gray.500" fontWeight="bold">
              {day}
            </Text>
          </GridItem>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return <GridItem key={`empty-${index}`} />;
          }

          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayShifts = shiftMap[dateString] || [];
          const dayTips = dayShifts.reduce((sum, shift) => sum + (Number(shift.tips) || 0), 0);
          const isToday =
            day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          const isSelected = selectedDate === dateString;
          const hasShifts = dayShifts.length > 0;

          return (
            <GridItem key={dateString}>
              <Box
                minH={{ base: '74px', md: '90px' }}
                p={2}
                border="1px solid"
                borderColor={
                  isSelected ? 'teal.300' : isToday ? 'orange.300' : 'whiteAlpha.100'
                }
                borderRadius="xl"
                bg={
                  isSelected
                    ? 'teal.900'
                    : hasShifts
                    ? 'whiteAlpha.100'
                    : 'transparent'
                }
                cursor="pointer"
                transition="all 0.15s ease"
                _hover={{ borderColor: 'teal.200', transform: 'translateY(-1px)' }}
                onClick={() => onDateClick?.(dateString, dayShifts)}
              >
                <Text fontSize="sm" fontWeight="bold" color={isToday ? 'orange.200' : 'gray.100'}>
                  {day}
                </Text>

                {hasShifts ? (
                  <Box mt={2}>
                    <Badge colorScheme="green" borderRadius="full" px={2}>
                      {dayShifts.length} {dayShifts.length === 1 ? 'shift' : 'shifts'}
                    </Badge>
                    <Text mt={2} fontSize="xs" color="green.200" fontWeight="semibold">
                      ${dayTips.toFixed(0)} tips
                    </Text>
                  </Box>
                ) : (
                  <Text mt={2} fontSize="xs" color="gray.600">
                    No shifts
                  </Text>
                )}
              </Box>
            </GridItem>
          );
        })}
      </Grid>
    </Box>
  );
}

export default CalendarView;
