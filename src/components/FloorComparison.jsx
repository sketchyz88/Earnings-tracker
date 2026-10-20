/**
 * Insights: where and when you earn the most.
 *
 * Two breakdowns over one shared date range — by day of the week and by
 * floor/section — each ranked by take-home per hour, which is the fairest way
 * to compare a 4-hour lunch with an 8-hour Saturday.
 */
import { useMemo, useState } from 'react';
import { Box, Button, Flex, SimpleGrid, Text } from '@chakra-ui/react';
import { formatCurrency, formatHours } from '../utils/format';
import { WEEKDAYS, summarize, summarizeTables, toDate } from '../utils/shiftMath';
import { ACCENTS, RADII, palette } from '../theme/tokens';
import { EmptyState, Label, Panel, PanelHeader, Segmented } from './ui';

const RANGE_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'all', label: 'All time' },
];

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function RankedRow({ isDarkMode, rank, name, stats, maxPerHour, isTop }) {
  const tokens = palette(isDarkMode);
  const width = maxPerHour > 0 ? Math.max(4, (stats.perHour / maxPerHour) * 100) : 0;

  return (
    <Box py={3} borderTop={rank > 1 ? '1px solid' : 'none'} borderColor={tokens.border}>
      <Flex justify="space-between" align="baseline" gap={3}>
        <Flex align="baseline" gap={2} minW={0}>
          <Text fontSize="12px" color={tokens.textSubtle} w="16px" flexShrink={0} data-numeric>
            {rank}
          </Text>
          <Box minW={0}>
            <Text fontSize="sm" fontWeight={650} color={tokens.text} noOfLines={1}>
              {name}
              {isTop ? (
                <Box
                  as="span"
                  ml={2}
                  fontSize="10px"
                  fontWeight={700}
                  textTransform="uppercase"
                  letterSpacing="0.06em"
                  color={ACCENTS.positive}
                >
                  Best
                </Box>
              ) : null}
            </Text>
            <Text fontSize="12px" color={tokens.textSubtle} data-numeric>
              {stats.shifts} {stats.shifts === 1 ? 'shift' : 'shifts'} · {formatHours(stats.hours)} hrs ·{' '}
              {stats.tipPercent.toFixed(1)}% tips · {formatCurrency(stats.perShift)}/shift
            </Text>
          </Box>
        </Flex>
        <Text fontSize="16px" fontWeight={700} color={tokens.text} flexShrink={0} data-numeric>
          {formatCurrency(stats.perHour)}
          <Box as="span" fontSize="12px" fontWeight={500} color={tokens.textSubtle}>
            /hr
          </Box>
        </Text>
      </Flex>
      <Box mt={2} ml="24px" h="6px" borderRadius="full" bg={tokens.surfaceSunken} overflow="hidden">
        <Box
          h="100%"
          w={`${width}%`}
          borderRadius="full"
          bg={isTop ? ACCENTS.positive : ACCENTS.primary}
          opacity={isTop ? 1 : 0.75}
          transition="width 320ms cubic-bezier(0.4, 0, 0.2, 1)"
        />
      </Box>
    </Box>
  );
}

function Breakdown({ isDarkMode, title, subtitle, rows, emptyText }) {
  const maxPerHour = Math.max(0, ...rows.map((row) => row.stats.perHour));
  return (
    <Panel isDarkMode={isDarkMode}>
      <PanelHeader isDarkMode={isDarkMode} title={title} subtitle={subtitle} mb={2} />
      {rows.length ? (
        rows.map((row, index) => (
          <RankedRow
            key={row.name}
            isDarkMode={isDarkMode}
            rank={index + 1}
            name={row.name}
            stats={row.stats}
            maxPerHour={maxPerHour}
            isTop={index === 0 && rows.length > 1}
          />
        ))
      ) : (
        <Box mt={3}>
          <EmptyState isDarkMode={isDarkMode} title={emptyText} />
        </Box>
      )}
    </Panel>
  );
}

const TABLE_SORTS = [
  { value: 'avgTip', label: 'Avg tip' },
  { value: 'tipPercent', label: 'Tip %' },
  { value: 'tips', label: 'Total' },
];
const TABLE_PAGE = 10;

function TableBreakdown({ isDarkMode, rows }) {
  const tokens = palette(isDarkMode);
  const [sortBy, setSortBy] = useState('avgTip');
  const [showAll, setShowAll] = useState(false);

  const sorted = [...rows].sort(
    (left, right) => right[sortBy] - left[sortBy] || right.checks - left.checks
  );
  const visible = showAll ? sorted : sorted.slice(0, TABLE_PAGE);
  const maxValue = Math.max(0, ...sorted.map((row) => row[sortBy]));
  const totalChecks = rows.reduce((sum, row) => sum + row.checks, 0);
  const overallAvg = totalChecks ? rows.reduce((sum, row) => sum + row.tips, 0) / totalChecks : 0;
  // Only call out a "best table" once it has enough checks to mean something.
  const reliable = [...rows].filter((row) => row.checks >= 3).sort((a, b) => b.avgTip - a.avgTip);
  const best = reliable[0];

  function display(row) {
    if (sortBy === 'tipPercent') return `${row.tipPercent.toFixed(1)}%`;
    if (sortBy === 'tips') return formatCurrency(row.tips);
    return formatCurrency(row.avgTip);
  }

  return (
    <Panel isDarkMode={isDarkMode}>
      <PanelHeader
        isDarkMode={isDarkMode}
        title="By table"
        subtitle={
          rows.length
            ? `${rows.length} tables · ${totalChecks} checks · ${formatCurrency(overallAvg)} average tip per check`
            : 'Add tables when you log a shift to see which ones tip best'
        }
        right={
          rows.length ? (
            <Segmented isDarkMode={isDarkMode} size="xs" options={TABLE_SORTS} value={sortBy} onChange={setSortBy} />
          ) : null
        }
        mb={rows.length ? 2 : 4}
      />

      {!rows.length ? (
        <EmptyState
          isDarkMode={isDarkMode}
          title="No tables logged in this range"
          subtitle="Open Add shift and use the Tables section to log each table's check and tip. Your rankings show up here."
        />
      ) : (
        <>
          {best && overallAvg > 0 && best.avgTip > overallAvg ? (
            <Text mb={2} fontSize="sm" color={tokens.textMuted} lineHeight="1.6" data-numeric>
              <Box as="span" color={tokens.text} fontWeight={600}>
                Table {best.table}
              </Box>{' '}
              averages {formatCurrency(best.avgTip)} per check, about{' '}
              {Math.round(((best.avgTip - overallAvg) / overallAvg) * 100)}% more than your typical table.
            </Text>
          ) : null}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacingX={8}>
            {visible.map((row, index) => {
              const width = maxValue > 0 ? Math.max(4, (row[sortBy] / maxValue) * 100) : 0;
              const isTop = index === 0 && sorted.length > 1;
              return (
                <Box key={row.table} py={3} borderTop="1px solid" borderColor={tokens.border}>
                  <Flex justify="space-between" align="baseline" gap={3}>
                    <Box minW={0}>
                      <Text fontSize="sm" fontWeight={650} color={tokens.text}>
                        Table {row.table}
                        {isTop ? (
                          <Box
                            as="span"
                            ml={2}
                            fontSize="10px"
                            fontWeight={700}
                            textTransform="uppercase"
                            letterSpacing="0.06em"
                            color={ACCENTS.positive}
                          >
                            Top
                          </Box>
                        ) : null}
                      </Text>
                      <Text fontSize="12px" color={tokens.textSubtle} data-numeric>
                        {row.checks} {row.checks === 1 ? 'check' : 'checks'} · {formatCurrency(row.avgCheck)} avg check ·{' '}
                        {row.tipPercent.toFixed(1)}% · {formatCurrency(row.tips)} total
                      </Text>
                    </Box>
                    <Text fontSize="16px" fontWeight={700} color={tokens.text} flexShrink={0} data-numeric>
                      {display(row)}
                    </Text>
                  </Flex>
                  <Box mt={2} h="6px" borderRadius="full" bg={tokens.surfaceSunken} overflow="hidden">
                    <Box
                      h="100%"
                      w={`${width}%`}
                      borderRadius="full"
                      bg={isTop ? ACCENTS.positive : ACCENTS.primary}
                      opacity={row.checks < 3 ? 0.4 : isTop ? 1 : 0.75}
                    />
                  </Box>
                </Box>
              );
            })}
          </SimpleGrid>
          <Flex mt={2} justify="space-between" align="center" gap={3} wrap="wrap">
            <Text fontSize="12px" color={tokens.textSubtle}>
              Faded bars have fewer than 3 checks, so treat them as early reads.
            </Text>
            {sorted.length > TABLE_PAGE ? (
              <Button size="sm" variant="ghost" color={tokens.textMuted} onClick={() => setShowAll((value) => !value)}>
                {showAll ? 'Show fewer' : `Show all ${sorted.length} tables`}
              </Button>
            ) : null}
          </Flex>
        </>
      )}
    </Panel>
  );
}

function FloorComparison({ isDarkMode = true, shifts, settings }) {
  const tokens = palette(isDarkMode);
  const [range, setRange] = useState('90');

  const rangeShifts = useMemo(() => {
    const all = (shifts || []).filter((shift) => shift?.date);
    if (range === 'all') {
      return all;
    }
    const today = startOfDay(new Date());
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (Number(range) - 1));
    return all.filter((shift) => {
      const shiftDate = toDate(shift.date);
      return shiftDate >= rangeStart && shiftDate <= today;
    });
  }, [range, shifts]);

  const overall = summarize(rangeShifts, settings);

  const weekdayRows = useMemo(() => {
    const buckets = WEEKDAYS.map(() => []);
    rangeShifts.forEach((shift) => buckets[toDate(shift.date).getDay()].push(shift));
    return buckets
      .map((bucket, index) => ({ name: WEEKDAYS[index], stats: summarize(bucket, settings) }))
      .filter((row) => row.stats.shifts > 0)
      .sort((left, right) => right.stats.perHour - left.stats.perHour);
  }, [rangeShifts, settings]);

  const floorRows = useMemo(() => {
    const buckets = new Map();
    rangeShifts.forEach((shift) => {
      const name = shift.floor?.trim() || 'No section set';
      if (!buckets.has(name)) {
        buckets.set(name, []);
      }
      buckets.get(name).push(shift);
    });
    return Array.from(buckets.entries())
      .map(([name, bucket]) => ({ name, stats: summarize(bucket, settings) }))
      .sort((left, right) => right.stats.perHour - left.stats.perHour);
  }, [rangeShifts, settings]);

  const tableRows = useMemo(() => summarizeTables(rangeShifts), [rangeShifts]);

  const bestDay = weekdayRows[0];
  const worstDay = weekdayRows[weekdayRows.length - 1];

  return (
    <Box display="grid" gap={4}>
      <Panel isDarkMode={isDarkMode}>
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} wrap="wrap">
          <Box>
            <Text fontSize="lg" fontWeight={700} letterSpacing="-0.02em" color={tokens.text}>
              Where and when you earn most
            </Text>
            <Text mt={1} fontSize="13px" color={tokens.textMuted}>
              Ranked by take-home per hour, so short and long shifts compare fairly.
            </Text>
          </Box>
          <Segmented isDarkMode={isDarkMode} options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </Flex>

        {overall.shifts ? (
          <SimpleGrid
            columns={{ base: 2, md: 4 }}
            spacing={3}
            mt={5}
            p={3}
            borderRadius={RADII.lg}
            bg={tokens.surfaceSunken}
            border="1px solid"
            borderColor={tokens.border}
          >
            {[
              ['Per hour', formatCurrency(overall.perHour)],
              ['Per shift', formatCurrency(overall.perShift)],
              ['Tip % of sales', `${overall.tipPercent.toFixed(1)}%`],
              ['Tip-out paid', formatCurrency(overall.tipOut)],
            ].map(([label, value]) => (
              <Box key={label}>
                <Label isDarkMode={isDarkMode}>{label}</Label>
                <Text mt={1} fontSize="17px" fontWeight={650} color={tokens.text} data-numeric>
                  {value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        ) : null}

        {bestDay && worstDay && bestDay !== worstDay ? (
          <Text mt={4} fontSize="sm" color={tokens.textMuted} lineHeight="1.6" data-numeric>
            <Box as="span" color={tokens.text} fontWeight={600}>
              {bestDay.name}s
            </Box>{' '}
            pay you {formatCurrency(bestDay.stats.perHour - worstDay.stats.perHour)}/hr more than{' '}
            {worstDay.name}s. If you can pick up or swap shifts, that&rsquo;s the day to chase.
          </Text>
        ) : null}
      </Panel>

      {!overall.shifts ? (
        <EmptyState
          isDarkMode={isDarkMode}
          title="No shifts in this range"
          subtitle="Pick a longer range above, or log a few shifts to see your best days and sections."
        />
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="start">
          <Breakdown
            isDarkMode={isDarkMode}
            title="By day of the week"
            subtitle="Average across every shift on that day"
            rows={weekdayRows}
            emptyText="No shifts yet"
          />
          <Breakdown
            isDarkMode={isDarkMode}
            title="By floor / section"
            subtitle="Set the floor when you log a shift to compare sections"
            rows={floorRows}
            emptyText="No floors recorded yet"
          />
        </SimpleGrid>
      )}

      <TableBreakdown isDarkMode={isDarkMode} rows={tableRows} />
    </Box>
  );
}

export default FloorComparison;
