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
import { WEEKDAYS, analyzeSections, summarize, toDate } from '../utils/shiftMath';
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

const PAGE = 8;

function DeltaRow({ isDarkMode, rank, row, maxPerHour, isTop, label }) {
  const tokens = palette(isDarkMode);
  const width = maxPerHour > 0 ? Math.max(4, (row.stats.perHour / maxPerHour) * 100) : 0;
  const isEarly = row.stats.shifts < 3;
  const deltaColor = row.delta > 0.005 ? ACCENTS.positive : row.delta < -0.005 ? ACCENTS.negative : tokens.textMuted;

  return (
    <Box py={3} borderTop={rank > 1 ? '1px solid' : 'none'} borderColor={tokens.border}>
      <Flex justify="space-between" align="baseline" gap={3}>
        <Flex align="baseline" gap={2} minW={0}>
          <Text fontSize="12px" color={tokens.textSubtle} w="16px" flexShrink={0} data-numeric>
            {rank}
          </Text>
          <Box minW={0}>
            <Text fontSize="sm" fontWeight={650} color={tokens.text} noOfLines={1}>
              {label}
              {isTop ? (
                <Box as="span" ml={2} fontSize="10px" fontWeight={700} textTransform="uppercase" letterSpacing="0.06em" color={ACCENTS.positive}>
                  Best
                </Box>
              ) : null}
            </Text>
            <Text fontSize="12px" color={tokens.textSubtle} data-numeric>
              {row.stats.shifts} {row.stats.shifts === 1 ? 'shift' : 'shifts'} · {formatCurrency(row.stats.perShift)}/shift ·{' '}
              {row.stats.tipPercent.toFixed(1)}% tips
            </Text>
          </Box>
        </Flex>
        <Box textAlign="right" flexShrink={0}>
          <Text fontSize="16px" fontWeight={700} color={tokens.text} data-numeric>
            {formatCurrency(row.stats.perHour)}
            <Box as="span" fontSize="12px" fontWeight={500} color={tokens.textSubtle}>
              /hr
            </Box>
          </Text>
          <Text fontSize="12px" fontWeight={600} color={deltaColor} data-numeric>
            {row.delta >= 0 ? '+' : '−'}
            {formatCurrency(Math.abs(row.delta))}/hr vs avg
          </Text>
        </Box>
      </Flex>
      <Box mt={2} ml="24px" h="6px" borderRadius="full" bg={tokens.surfaceSunken} overflow="hidden">
        <Box
          h="100%"
          w={`${width}%`}
          borderRadius="full"
          bg={isTop ? ACCENTS.positive : ACCENTS.primary}
          opacity={isEarly ? 0.35 : isTop ? 1 : 0.75}
        />
      </Box>
    </Box>
  );
}

function RankedList({ isDarkMode, title, subtitle, rows, labelFor }) {
  const tokens = palette(isDarkMode);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, PAGE);
  const maxPerHour = Math.max(0, ...rows.map((row) => row.stats.perHour));
  const topIndex = rows.findIndex((row) => row.stats.shifts >= 3);

  return (
    <Panel isDarkMode={isDarkMode}>
      <PanelHeader isDarkMode={isDarkMode} title={title} subtitle={subtitle} mb={2} />
      {visible.map((row, index) => (
        <DeltaRow
          key={row.key}
          isDarkMode={isDarkMode}
          rank={index + 1}
          row={row}
          maxPerHour={maxPerHour}
          isTop={index === topIndex && rows.length > 1}
          label={labelFor(row)}
        />
      ))}
      {rows.length > PAGE ? (
        <Button mt={1} size="sm" variant="ghost" width="100%" color={tokens.textMuted} onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer' : `Show all ${rows.length}`}
        </Button>
      ) : null}
    </Panel>
  );
}

function SectionInsights({ isDarkMode, analysis }) {
  const tokens = palette(isDarkMode);
  const { baseline, sections, tables, sectionedShifts } = analysis;

  if (!sectionedShifts) {
    return (
      <Panel isDarkMode={isDarkMode}>
        <PanelHeader isDarkMode={isDarkMode} title="Tables & sections" mb={4} />
        <EmptyState
          isDarkMode={isDarkMode}
          title="No sections logged in this range"
          subtitle="When you add a shift, type the tables you were assigned (like 39A, 37, 36) under “Your section.” After a few shifts this shows which tables and sections earn you the most."
        />
      </Panel>
    );
  }

  const reliable = tables.filter((row) => row.stats.shifts >= 3);
  const best = reliable[0];

  return (
    <Box display="grid" gap={4}>
      <Panel isDarkMode={isDarkMode}>
        <Text fontSize="lg" fontWeight={700} letterSpacing="-0.02em" color={tokens.text}>
          Tables &amp; sections
        </Text>
        <Text mt={1} fontSize="13px" color={tokens.textMuted} lineHeight="1.6" data-numeric>
          Based on {sectionedShifts} {sectionedShifts === 1 ? 'shift' : 'shifts'} with a section logged, where you
          averaged {formatCurrency(baseline.perHour)}/hr. Each table is scored by how your whole shift went when it was in
          your section.
        </Text>
        {best && best.delta > 0 ? (
          <Text mt={3} fontSize="sm" color={tokens.textMuted} lineHeight="1.6" data-numeric>
            Nights with{' '}
            <Box as="span" color={tokens.text} fontWeight={600}>
              table {best.name}
            </Box>{' '}
            pay you {formatCurrency(best.delta)}/hr more than your average. That&rsquo;s the one to ask for.
          </Text>
        ) : (
          <Text mt={3} fontSize="12px" color={tokens.textSubtle}>
            Faded bars have fewer than 3 shifts. Rankings firm up as you log more sections.
          </Text>
        )}
      </Panel>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="start">
        <RankedList
          isDarkMode={isDarkMode}
          title="By table"
          subtitle="Your average when this table was in your section"
          rows={tables}
          labelFor={(row) => `Table ${row.name}`}
        />
        <RankedList
          isDarkMode={isDarkMode}
          title="By section"
          subtitle="The exact set of tables you had. Sections seen 3+ times rank first"
          rows={sections}
          labelFor={(row) => row.name}
        />
      </SimpleGrid>
    </Box>
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

  const sectionAnalysis = useMemo(() => analyzeSections(rangeShifts, settings), [rangeShifts, settings]);

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

      {overall.shifts ? <SectionInsights isDarkMode={isDarkMode} analysis={sectionAnalysis} /> : null}

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

    </Box>
  );
}

export default FloorComparison;
