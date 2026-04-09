import React, { useState } from 'react';
import { Box, Grid, GridItem, Text, Heading, Flex, IconButton, Badge } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
const ce = React.createElement;

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

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); } };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); } };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayHeaders = DAYS.map(d =>
    ce(GridItem, { key: d },
      ce(Text, { fontSize: 'xs', fontWeight: 'bold', color: 'gray.500', textAlign: 'center', py: 1 }, d)
    )
  );

  const dayCells = cells.map((d, i) => {
    if (!d) return ce(GridItem, { key: 'empty-' + i });
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const dayShifts = shiftMap[dateStr] || [];
    const totalTips = dayShifts.reduce((sum, s) => sum + (parseFloat(s.tips) || 0), 0);
    const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    const hasShifts = dayShifts.length > 0;

    return ce(GridItem, { key: dateStr },
      ce(Box, {
        minH: '60px',
        p: 1,
        border: '1px',
        borderColor: isToday ? 'teal.400' : 'gray.100',
        borderRadius: 'md',
        bg: isToday ? 'teal.50' : hasShifts ? 'green.50' : 'white',
        cursor: hasShifts ? 'pointer' : 'default',
        onClick: hasShifts ? () => onDateClick && onDateClick(dateStr, dayShifts) : undefined,
      },
        ce(Text, { fontSize: 'xs', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'teal.700' : 'gray.700', mb: 1 }, String(d)),
        hasShifts && ce(Box, null,
          ce(Badge, { colorScheme: 'green', fontSize: '9px', display: 'block', mb: '1px' }, dayShifts.length + (dayShifts.length > 1 ? ' shifts' : ' shift')),
          ce(Text, { fontSize: '9px', color: 'green.700', fontWeight: 'bold' }, '$' + totalTips.toFixed(0))
        )
      )
    );
  });

  return ce(Box, null,
    ce(Flex, { align: 'center', justify: 'space-between', mb: 4 },
      ce(IconButton, { icon: ce(ChevronLeft, { size: 16 }), onClick: prev, variant: 'ghost', size: 'sm', 'aria-label': 'Previous month' }),
      ce(Heading, { size: 'md', color: 'gray.700' }, MONTHS[month] + ' ' + year),
      ce(IconButton, { icon: ce(ChevronRight, { size: 16 }), onClick: next, variant: 'ghost', size: 'sm', 'aria-label': 'Next month' })
    ),
    ce(Grid, { templateColumns: 'repeat(7, 1fr)', gap: 1 },
      ...dayHeaders,
      ...dayCells
    )
  );
};

export default CalendarView;
