import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { ChevronDown, Pencil, Search, Trash2 } from 'lucide-react';
import { formatCurrency, formatHours } from '../utils/format';
import {
  formatShiftTime,
  getBasePay,
  getGrossTips,
  getHours,
  getNetTips,
  getSales,
  getTakeHome,
  getTipOut,
  summarize,
  toDate,
} from '../utils/shiftMath';
import { ACCENTS, RADII, palette } from '../theme/tokens';
import { EmptyState, Panel, PanelHeader, Tag } from './ui';

function getShiftSortTimestamp(shift) {
  if (!shift?.date) {
    return Number.NEGATIVE_INFINITY;
  }
  const timeValue = shift.endTime || shift.startTime || '00:00';
  return new Date(`${shift.date}T${timeValue.slice(0, 5)}:00`).getTime();
}

function getJobName(jobId, jobs) {
  return jobs.find((job) => job.id === jobId)?.name || '';
}

function monthKey(dateString) {
  return (dateString || '').slice(0, 7);
}

function monthLabel(key) {
  const date = new Date(`${key}-01T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function BreakdownItem({ tokens, label, value, color }) {
  return (
    <Box>
      <Text fontSize="11px" color={tokens.textSubtle} fontWeight={500}>
        {label}
      </Text>
      <Text mt={0.5} fontSize="sm" fontWeight={600} color={color || tokens.text} data-numeric>
        {value}
      </Text>
    </Box>
  );
}

function ShiftRow({ isDarkMode, shift, settings, jobs, showJob, onEdit, onDelete }) {
  const tokens = palette(isDarkMode);
  const [isOpen, setIsOpen] = useState(false);
  const date = toDate(shift.date);
  const hours = getHours(shift);
  const sales = getSales(shift);
  const tips = getGrossTips(shift);
  const tipOut = getTipOut(shift, settings);
  const netTips = getNetTips(shift, settings);
  const basePay = getBasePay(shift, settings);
  const takeHome = getTakeHome(shift, settings);
  const timeLabel = formatShiftTime(shift);
  const jobName = showJob ? getJobName(shift.jobId, jobs) : '';
  const tipPercent = sales > 0 ? (tips / sales) * 100 : 0;

  return (
    <Box
      bg={isOpen ? tokens.surfaceRaised : 'transparent'}
      transition="background-color 120ms ease"
      _hover={{ bg: tokens.surfaceRaised }}
    >
      <Flex
        as="button"
        type="button"
        w="100%"
        textAlign="left"
        align="center"
        gap={{ base: 3, md: 4 }}
        px={{ base: 3, md: 5 }}
        py={3}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        data-shift-row
      >
        {/* Date block — the thing people scan for first. */}
        <Flex
          direction="column"
          align="center"
          justify="center"
          w="46px"
          h="50px"
          flexShrink={0}
          borderRadius={RADII.md}
          bg={tokens.surfaceSunken}
          border="1px solid"
          borderColor={tokens.border}
        >
          <Text fontSize="10px" fontWeight={600} color={tokens.textMuted} textTransform="uppercase" letterSpacing="0.06em">
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
          <Text fontSize="19px" fontWeight={700} lineHeight="1.1" color={tokens.text} data-numeric>
            {date.getDate()}
          </Text>
        </Flex>

        <Box flex="1" minW={0}>
          <HStack spacing={1.5} wrap="wrap" rowGap={1}>
            <Text fontSize="sm" fontWeight={600} color={tokens.text} data-numeric>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            {jobName ? <Tag isDarkMode={isDarkMode}>{jobName}</Tag> : null}
            {shift.floor ? <Tag isDarkMode={isDarkMode} tone="accent">{shift.floor}</Tag> : null}
          </HStack>
          <Text mt={1} fontSize="13px" color={tokens.textMuted} data-numeric>
            {timeLabel ? (
              <Box as="span" display={{ base: 'block', md: 'inline' }}>
                {timeLabel}
                <Box as="span" display={{ base: 'none', md: 'inline' }}>
                  {' · '}
                </Box>
              </Box>
            ) : null}
            {formatHours(hours)} hrs · {formatCurrency(sales)} sales
          </Text>
          {shift.notes ? (
            <Text mt={0.5} fontSize="12px" color={tokens.textSubtle} noOfLines={1}>
              {shift.notes}
            </Text>
          ) : null}
        </Box>

        <Box textAlign="right" flexShrink={0}>
          <Text fontSize={{ base: '17px', md: '19px' }} fontWeight={700} letterSpacing="-0.02em" color={tokens.text} data-numeric>
            {formatCurrency(takeHome)}
          </Text>
          <Text fontSize="12px" color={tokens.textSubtle} data-numeric>
            {formatCurrency(netTips)} net tips
          </Text>
        </Box>

        <Box
          color={tokens.textSubtle}
          transform={isOpen ? 'rotate(180deg)' : 'none'}
          transition="transform 160ms ease"
          display={{ base: 'none', sm: 'block' }}
        >
          <ChevronDown size={16} />
        </Box>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <Box px={{ base: 3, md: 5 }} pb={4} pl={{ base: 3, md: '86px' }}>
          <SimpleGrid
            columns={{ base: 3, md: 6 }}
            spacing={3}
            p={3}
            borderRadius={RADII.md}
            bg={tokens.surfaceSunken}
            border="1px solid"
            borderColor={tokens.border}
          >
            <BreakdownItem tokens={tokens} label="Gross tips" value={formatCurrency(tips)} />
            <BreakdownItem tokens={tokens} label="Tip %" value={`${tipPercent.toFixed(1)}%`} />
            <BreakdownItem tokens={tokens} label="Tip-out" value={`−${formatCurrency(tipOut)}`} color={ACCENTS.negative} />
            <BreakdownItem tokens={tokens} label="Net tips" value={formatCurrency(netTips)} />
            <BreakdownItem tokens={tokens} label="Base pay" value={formatCurrency(basePay)} />
            <BreakdownItem
              tokens={tokens}
              label="Per hour"
              value={hours > 0 ? formatCurrency(takeHome / hours) : '—'}
              color={ACCENTS.positive}
            />
          </SimpleGrid>
          <HStack mt={3} spacing={2}>
            <Button size="sm" variant="outline" leftIcon={<Pencil size={14} />} onClick={() => onEdit?.(shift)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color={ACCENTS.negative}
              leftIcon={<Trash2 size={14} />}
              onClick={() => onDelete?.(shift.id)}
            >
              Delete
            </Button>
          </HStack>
        </Box>
      </Collapse>
    </Box>
  );
}

function ShiftsByDay({
  isDarkMode = false,
  shifts,
  settings,
  jobs = [],
  onEdit,
  onDelete,
  title = 'All shifts',
  badgeLabel,
  emptyTitle = 'No shifts logged yet.',
  emptySubtitle = 'Add a shift to get started.',
  searchable = false,
  groupByMonth = true,
  footer = null,
  filters = null,
}) {
  const tokens = palette(isDarkMode);
  const [query, setQuery] = useState('');
  const showJob = jobs.length > 1;

  const visibleShifts = useMemo(() => {
    const sorted = [...(shifts || [])].sort(
      (left, right) => getShiftSortTimestamp(right) - getShiftSortTimestamp(left)
    );
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return sorted;
    }
    return sorted.filter((shift) => {
      const date = shift.date ? toDate(shift.date) : null;
      const haystack = [
        shift.notes,
        shift.floor,
        getJobName(shift.jobId, jobs),
        shift.date,
        date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [jobs, query, shifts]);

  const groups = useMemo(() => {
    if (!groupByMonth) {
      return [{ key: 'all', shifts: visibleShifts }];
    }
    const map = new Map();
    visibleShifts.forEach((shift) => {
      const key = monthKey(shift.date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(shift);
    });
    return Array.from(map.entries()).map(([key, groupShifts]) => ({ key, shifts: groupShifts }));
  }, [groupByMonth, visibleShifts]);

  const totals = summarize(visibleShifts, settings);
  const count = visibleShifts.length;

  return (
    <Panel isDarkMode={isDarkMode} padded={false} overflow="hidden">
      <Box px={{ base: 4, md: 6 }} pt={{ base: 4, md: 5 }} pb={4}>
        <PanelHeader
          isDarkMode={isDarkMode}
          title={title}
          subtitle={
            count
              ? `${badgeLabel || `${count} ${count === 1 ? 'shift' : 'shifts'}`} · ${formatCurrency(
                  totals.takeHome
                )} take-home · ${formatCurrency(totals.perHour)}/hr`
              : badgeLabel
          }
          mb={searchable || filters ? 4 : 0}
        />
        {filters}
        {searchable ? (
          <InputGroup size="sm" mt={filters ? 3 : 0}>
            <InputLeftElement pointerEvents="none" color={tokens.textSubtle}>
              <Search size={14} />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes, floor, job, or day"
              aria-label="Search shifts"
            />
          </InputGroup>
        ) : null}
      </Box>

      {!count ? (
        <Box px={{ base: 4, md: 6 }} pb={6}>
          <EmptyState
            isDarkMode={isDarkMode}
            title={query ? `Nothing matches “${query}”` : emptyTitle}
            subtitle={query ? 'Try a different word or clear the search.' : emptySubtitle}
          />
        </Box>
      ) : (
        groups.map((group) => {
          const groupTotals = groupByMonth ? summarize(group.shifts, settings) : null;
          return (
            <Box key={group.key}>
              {groupByMonth ? (
                <Flex
                  justify="space-between"
                  align="baseline"
                  gap={3}
                  px={{ base: 4, md: 6 }}
                  py={2}
                  bg={tokens.surfaceSunken}
                  borderTop="1px solid"
                  borderBottom="1px solid"
                  borderColor={tokens.border}
                >
                  <Text fontSize="12px" fontWeight={700} color={tokens.text} letterSpacing="0.02em">
                    {monthLabel(group.key)}
                  </Text>
                  <Text fontSize="12px" color={tokens.textMuted} data-numeric>
                    {groupTotals.shifts} {groupTotals.shifts === 1 ? 'shift' : 'shifts'} ·{' '}
                    {formatHours(groupTotals.hours)} hrs ·{' '}
                    <Box as="span" color={tokens.text} fontWeight={600}>
                      {formatCurrency(groupTotals.takeHome)}
                    </Box>
                  </Text>
                </Flex>
              ) : (
                <Box borderTop="1px solid" borderColor={tokens.border} />
              )}
              <Box>
                {group.shifts.map((shift, index) => (
                  <Box key={shift.id} borderTop={index ? '1px solid' : 'none'} borderColor={tokens.border}>
                    <ShiftRow
                      isDarkMode={isDarkMode}
                      shift={shift}
                      settings={settings}
                      jobs={jobs}
                      showJob={showJob}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })
      )}
      {footer ? (
        <Box borderTop="1px solid" borderColor={tokens.border} px={{ base: 4, md: 6 }} py={3}>
          {footer}
        </Box>
      ) : null}
    </Panel>
  );
}

export default ShiftsByDay;
