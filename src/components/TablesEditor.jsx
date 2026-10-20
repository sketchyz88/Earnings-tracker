/**
 * "Your section": the tables you were assigned on a shift (e.g. 39A, 37, 36).
 *
 * Servers usually know the shift's total tips, not each table's, so this only
 * asks for table numbers. Insights then compares shifts by which tables were
 * in the section. Type a table and press Enter, space, or comma to add it, or
 * tap a recent section to reuse it.
 */
import { useState } from 'react';
import { Box, Button, Flex, IconButton, Input, Text } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { normalizeTableName } from '../utils/shiftMath';
import { ACCENTS, RADII, palette } from '../theme/tokens';

export function rowsFromShift(shift) {
  if (!Array.isArray(shift?.tables)) {
    return [];
  }
  return shift.tables
    .map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      table: normalizeTableName(entry.table),
      sales: Number(entry.sales) || 0,
      tip: Number(entry.tip) || 0,
    }))
    .filter((entry) => entry.table);
}

/** Rows ready to save: one entry per table, numbers kept if an old entry had them. */
export function rowsForSave(rows) {
  const seen = new Set();
  return (rows || [])
    .map((row) => ({ ...row, table: normalizeTableName(row.table) }))
    .filter((row) => row.table && !seen.has(row.table) && seen.add(row.table))
    .map((row) => ({
      id: row.id || crypto.randomUUID(),
      table: row.table,
      sales: Number(row.sales) || 0,
      tip: Number(row.tip) || 0,
    }));
}

/** Most recent distinct sections from saved shifts, newest first. */
export function getRecentSections(shifts, limit = 4) {
  const seen = new Set();
  const sections = [];
  [...(shifts || [])]
    .filter((shift) => Array.isArray(shift.tables) && shift.tables.length)
    .sort((left, right) => (right.date || '').localeCompare(left.date || ''))
    .forEach((shift) => {
      const names = rowsForSave(shift.tables)
        .map((row) => row.table)
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
      const key = [...names].sort().join('|');
      if (names.length && !seen.has(key) && sections.length < limit) {
        seen.add(key);
        sections.push(names);
      }
    });
  return sections;
}

function TablesEditor({ isDarkMode, rows, onChange, recentSections = [] }) {
  const tokens = palette(isDarkMode);
  const [draft, setDraft] = useState('');
  const tables = rowsForSave(rows);

  function addTables(text) {
    const names = String(text)
      .split(/[\s,]+/)
      .map(normalizeTableName)
      .filter(Boolean);
    if (!names.length) {
      return;
    }
    onChange(rowsForSave([...tables, ...names.map((table) => ({ id: crypto.randomUUID(), table }))]));
    setDraft('');
  }

  function removeTable(table) {
    onChange(tables.filter((row) => row.table !== table));
  }

  return (
    <Box p={3} borderRadius={RADII.lg} border="1px solid" borderColor={tokens.border} bg={tokens.surfaceSunken}>
      <Flex gap={2} wrap="wrap" align="center">
        {tables.map((row) => (
          <Flex
            key={row.table}
            align="center"
            gap={1}
            pl={3}
            pr={1}
            h="32px"
            borderRadius={RADII.pill}
            bg={ACCENTS.primaryMuted}
            color={ACCENTS.primary}
            fontWeight={650}
            fontSize="14px"
          >
            {row.table}
            <IconButton
              icon={<X size={13} />}
              size="xs"
              variant="ghost"
              color={ACCENTS.primary}
              borderRadius="full"
              minW="22px"
              h="22px"
              aria-label={`Remove table ${row.table}`}
              onClick={() => removeTable(row.table)}
            />
          </Flex>
        ))}
        <Input
          flex="1"
          minW="120px"
          size="sm"
          h="32px"
          value={draft}
          placeholder={tables.length ? 'Add another' : 'Type a table, e.g. 39A'}
          autoCapitalize="characters"
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Add a table to your section"
          onChange={(event) => {
            const value = event.target.value;
            // A space or comma finishes a table, so "39A 37 36" works in one go.
            if (/[\s,]$/.test(value)) {
              addTables(value);
            } else {
              setDraft(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTables(draft);
            } else if (event.key === 'Backspace' && !draft && tables.length) {
              removeTable(tables[tables.length - 1].table);
            }
          }}
          onBlur={() => addTables(draft)}
        />
      </Flex>

      {recentSections.length ? (
        <Box mt={3}>
          <Text fontSize="11px" fontWeight={600} color={tokens.textMuted} mb={1.5}>
            Recent sections
          </Text>
          <Flex gap={2} wrap="wrap">
            {recentSections.map((names) => (
              <Button
                key={names.join('|')}
                size="xs"
                variant="outline"
                borderColor={tokens.borderStrong}
                color={tokens.text}
                fontWeight={500}
                onClick={() => onChange(rowsForSave(names.map((table) => ({ id: crypto.randomUUID(), table }))))}
              >
                {names.join(' · ')}
              </Button>
            ))}
          </Flex>
        </Box>
      ) : (
        <Text mt={2} fontSize="12px" color={tokens.textMuted}>
          Optional. Add the tables you were assigned and Insights will show which ones earn you the most.
        </Text>
      )}
    </Box>
  );
}

export default TablesEditor;
