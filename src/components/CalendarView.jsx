import { useState } from 'react';
import { Box, Grid, GridItem, Text, Heading, Flex, IconButton, Badge, Tooltip } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CalendarView = ({ shifts, onDateClick }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const shiftMap = {};
  (shifts || []).forEach(s => {
    if (!shiftMap[s.date]) shiftMap[s.date] = [];
    shiftMap[s.date].push(s);
    });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
        <Box bg="white" rounded="lg" shadow="sm" border="1px" borderColor="gray.200" p={4}>
          <Flex align="center" justify="space-between" mb={4}>
            <IconButton icon={<ChevronLeft size={16} />} size="sm" variant="ghost" onClick={prev} aria-label="Prev" />
            <Heading size="sm">{MONTHS[month]} {year}</Heading>
            <IconButton icon={<ChevronRight size={16} />} size="sm" variant="ghost" onClick={next} aria-label="Next" />
          </Flex>
          <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={2}>
    {DAYS.map(d => <GridItem key={d} textAlign="center"><Text fontSize="xs" fontWeight="bold" color="gray.500">{d}</Text></GridItem>)}
          </Grid>
          <Grid templateColumns="repeat(7, 1fr)" gap={1}>
    {cells.map((day, idx) => {
              if (!day) return <GridItem key={idx} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayShifts = shiftMap[dateStr] || [];
          const totalTips = dayShifts.reduce((s, sh) => s + (parseFloat(sh.tips) || 0), 0);
          const isToday = dateStr === now.toISOString().split('T')[0];
          return (
            <GridItem key={idx}>
              <Box
                p={1}
                rounded="md"
                bg={dayShifts.length ? 'teal.50' : isToday ? 'blue.50' : 'transparent'}
                border="1px"
                borderColor={isToday ? 'blue.400' : dayShifts.length ? 'teal.200' : 'transparent'}
                cursor={dayShifts.length ? 'pointer' : 'default'}
                onClick={() => dayShifts.length && onDateClick && onDateClick(dateStr)}
                _hover={dayShifts.length ? { bg: 'teal.100' } : {}}
                minH="40px"
              >
                <Text fontSize="xs" fontWeight={isToday ? 'bold' : 'normal'} color={isToday ? 'blue.600' : 'gray.700'}>{day}</Text>
{dayShifts.length > 0 && (
                  <Text fontSize="10px" color="teal.700" fontWeight="bold">${totalTips.toFixed(0)}</Text>
                )}
              </Box>
            </GridItem>
          );
})}
      </Grid>
    </Box>
  );
};

export default CalendarView;
