import { useMemo, useState } from 'react';
import { Box, Button, Flex, Grid, IconButton, SimpleGrid, Text } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatCurrencyWhole, formatHours } from '../utils/format';
import { getTakeHome, summarize } from '../utils/shiftMath';
import { ACCENTS, RADII, palette } from '../theme/tokens';
import { Label, Panel } from './ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function CalendarView({ isDarkMode = true, shifts, settings, selectedDate, onDateClick }) {
  const tokens = palette(isDarkMode);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const shiftMap = useMemo(() => {
    return (shifts || []).reduce((accumulator, shift) => {
      if (!shift.date) {
        return accumulator;
      }
      (accumulator[shift.date] ||= []).push(shift);
      return accumulator;
    }, {});
  }, [shifts]);

  const monthPrefix = `${year}-${pad(month + 1)}`;
  const monthShifts = useMemo(
    () => (shifts || []).filter((shift) => shift.date?.startsWith(monthPrefix)),
    [monthPrefix, shifts]
  );
  const monthTotals = summarize(monthShifts, settings);

  const dayTotals = useMemo(() => {
    const totals = {};
    monthShifts.forEach((shift) => {
      totals[shift.date] = (totals[shift.date] || 0) + getTakeHome(shift, settings);
    });
    return totals;
  }, [monthShifts, settings]);
  const maxDay = Math.max(0, ...Object.values(dayTotals));
  const bestDate = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];

  function shiftMonth(delta) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <Panel isDarkMode={isDarkMode}>
      <Flex align="center" justify="space-between" mb={4} gap={2}>
        <IconButton
          icon={<ChevronLeft size={18} />}
          onClick={() => shiftMonth(-1)}
          variant="ghost"
          size="sm"
          color={tokens.textMuted}
          aria-label="Previous month"
        />
        <Box textAlign="center">
          <Text fontSize="lg" fontWeight={700} letterSpacing="-0.02em" color={tokens.text}>
            {new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          {!isCurrentMonth ? (
            <Button
              size="xs"
              variant="link"
              color={ACCENTS.primary}
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
              }}
            >
              Back to this month
            </Button>
          ) : null}
        </Box>
        <IconButton
          icon={<ChevronRight size={18} />}
          onClick={() => shiftMonth(1)}
          variant="ghost"
          size="sm"
          color={tokens.textMuted}
          aria-label="Next month"
        />
      </Flex>

      <SimpleGrid
        columns={{ base: 2, md: 4 }}
        spacing={3}
        mb={5}
        p={3}
        borderRadius={RADII.lg}
        bg={tokens.surfaceSunken}
        border="1px solid"
        borderColor={tokens.border}
      >
        {[
          ['Take-home', formatCurrency(monthTotals.takeHome)],
          ['Shifts', `${monthTotals.shifts} · ${formatHours(monthTotals.hours)} hrs`],
          ['Per hour', formatCurrency(monthTotals.perHour)],
          [
            'Best day',
            bestDate
              ? `${DAYS[new Date(`${bestDate[0]}T00:00:00`).getDay()]} ${Number(
                  bestDate[0].slice(8)
                )} · ${formatCurrencyWhole(bestDate[1])}`
              : '—',
          ],
        ].map(([label, value]) => (
          <Box key={label}>
            <Label isDarkMode={isDarkMode}>{label}</Label>
            <Text mt={1} fontSize="15px" fontWeight={650} color={tokens.text} data-numeric>
              {value}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Grid templateColumns="repeat(7, minmax(0, 1fr))" gap={{ base: 1, md: 2 }}>
        {DAYS.map((day) => (
          <Text key={day} textAlign="center" fontSize="11px" color={tokens.textSubtle} fontWeight={600} pb={1}>
            {day}
          </Text>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return <Box key={`empty-${index}`} />;
          }

          const dateString = `${monthPrefix}-${pad(day)}`;
          const dayShifts = shiftMap[dateString] || [];
          const total = dayTotals[dateString] || 0;
          const hasShifts = dayShifts.length > 0;
          const isToday = isCurrentMonth && day === now.getDate();
          const isSelected = selectedDate === dateString;
          // Heat: stronger fill for bigger days, floor at 0.12 so any logged day reads.
          const intensity = hasShifts && maxDay > 0 ? 0.12 + 0.5 * (total / maxDay) : 0;

          return (
            <Box
              as="button"
              type="button"
              key={dateString}
              minH={{ base: '54px', md: '84px' }}
              p={{ base: 1, md: 2 }}
              textAlign="left"
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
              border="1px solid"
              borderColor={isSelected ? ACCENTS.primary : isToday ? ACCENTS.warning : tokens.border}
              borderRadius={RADII.md}
              bg={hasShifts ? `rgba(59, 130, 246, ${intensity.toFixed(2)})` : 'transparent'}
              transition="border-color 120ms ease, transform 120ms ease"
              _hover={{ borderColor: ACCENTS.primary }}
              onClick={() => onDateClick?.(dateString, dayShifts)}
              aria-label={`${dateString}${hasShifts ? `, ${formatCurrency(total)} take-home` : ', no shifts'}`}
            >
              <Text
                fontSize={{ base: '11px', md: '13px' }}
                fontWeight={isToday ? 700 : 600}
                color={isToday ? ACCENTS.warning : hasShifts ? tokens.text : tokens.textSubtle}
                data-numeric
              >
                {day}
              </Text>
              {hasShifts ? (
                <Box>
                  <Text
                    fontSize={{ base: '10px', md: '14px' }}
                    fontWeight={700}
                    color={tokens.text}
                    letterSpacing="-0.02em"
                    data-numeric
                    noOfLines={1}
                  >
                    {formatCurrencyWhole(total)}
                  </Text>
                  {dayShifts.length > 1 ? (
                    <Text fontSize="10px" color={tokens.textMuted} display={{ base: 'none', md: 'block' }}>
                      {dayShifts.length} shifts
                    </Text>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Grid>
      <Text mt={3} fontSize="12px" color={tokens.textSubtle}>
        Darker days earned more. Tap a day to see its shifts.
      </Text>
    </Panel>
  );
}

export default CalendarView;
