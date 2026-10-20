/**
 * Quick entry for the tables you served on a shift: table number, check total,
 * and tip. Built for a phone at the end of a night — big inputs, numeric
 * keyboards, and Enter on the last tip jumps to a fresh row.
 */
import { useState } from 'react';
import { Box, Button, Flex, Grid, IconButton, Input, Text } from '@chakra-ui/react';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { ACCENTS, RADII, palette } from '../theme/tokens';

function newRow() {
  return { id: crypto.randomUUID(), table: '', sales: '', tip: '' };
}

export function rowsFromShift(shift) {
  if (!Array.isArray(shift?.tables)) {
    return [];
  }
  return shift.tables.map((entry) => ({
    id: entry.id || crypto.randomUUID(),
    table: entry.table ?? '',
    sales: entry.sales ? String(entry.sales) : '',
    tip: entry.tip ? String(entry.tip) : '',
  }));
}

/** Rows ready to save: drop empty ones, store numbers as numbers. */
export function rowsForSave(rows) {
  return (rows || [])
    .filter((row) => String(row.table).trim())
    .map((row) => ({
      id: row.id,
      table: String(row.table).trim(),
      sales: Number(row.sales) || 0,
      tip: Number(row.tip) || 0,
    }));
}

function TablesEditor({ isDarkMode, rows, onChange, onUseTotals }) {
  const tokens = palette(isDarkMode);
  const [focusId, setFocusId] = useState(null);

  const filled = rowsForSave(rows);
  const totalTips = filled.reduce((sum, row) => sum + row.tip, 0);
  const totalSales = filled.reduce((sum, row) => sum + row.sales, 0);

  function update(id, field, value) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    const row = newRow();
    setFocusId(row.id);
    onChange([...rows, row]);
  }

  function removeRow(id) {
    onChange(rows.filter((row) => row.id !== id));
  }

  const inputProps = {
    size: 'sm',
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
  };

  return (
    <Box
      p={3}
      borderRadius={RADII.lg}
      border="1px solid"
      borderColor={tokens.border}
      bg={tokens.surfaceSunken}
    >
      {rows.length ? (
        <Grid templateColumns="minmax(0,0.8fr) minmax(0,1fr) minmax(0,1fr) 28px" gap={2} alignItems="center">
          {['Table #', 'Check $', 'Tip $', ''].map((label) => (
            <Text key={label || 'x'} fontSize="11px" fontWeight={600} color={tokens.textMuted}>
              {label}
            </Text>
          ))}
          {rows.map((row, index) => (
            <Box key={row.id} display="contents">
              <Input
                {...inputProps}
                inputMode="text"
                autoCapitalize="characters"
                placeholder="12"
                value={row.table}
                autoFocus={row.id === focusId}
                onChange={(event) => update(row.id, 'table', event.target.value)}
                aria-label={`Table number, row ${index + 1}`}
              />
              <Input
                {...inputProps}
                placeholder="0.00"
                value={row.sales}
                onChange={(event) => update(row.id, 'sales', event.target.value.replace(/[^0-9.]/g, ''))}
                aria-label={`Check total, row ${index + 1}`}
              />
              <Input
                {...inputProps}
                placeholder="0.00"
                value={row.tip}
                onChange={(event) => update(row.id, 'tip', event.target.value.replace(/[^0-9.]/g, ''))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && index === rows.length - 1) {
                    event.preventDefault();
                    addRow();
                  }
                }}
                aria-label={`Tip, row ${index + 1}`}
              />
              <IconButton
                icon={<X size={14} />}
                size="xs"
                variant="ghost"
                color={tokens.textSubtle}
                aria-label={`Remove row ${index + 1}`}
                onClick={() => removeRow(row.id)}
              />
            </Box>
          ))}
        </Grid>
      ) : (
        <Text fontSize="13px" color={tokens.textMuted}>
          Optional. Log each table&rsquo;s check and tip, and Insights will show which tables tip you best.
        </Text>
      )}

      <Flex mt={3} justify="space-between" align="center" gap={2} wrap="wrap">
        <Button size="sm" variant="ghost" color={ACCENTS.primary} leftIcon={<Plus size={14} />} onClick={addRow}>
          Add table
        </Button>
        {filled.length ? (
          <Flex align="center" gap={2} wrap="wrap">
            <Text fontSize="12px" color={tokens.textMuted} data-numeric>
              {filled.length} {filled.length === 1 ? 'table' : 'tables'} · {formatCurrency(totalSales)} ·{' '}
              <Box as="span" color={tokens.text} fontWeight={600}>
                {formatCurrency(totalTips)} tips
              </Box>
            </Text>
            {onUseTotals ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onUseTotals({ tips: totalTips, sales: totalSales })}
                title="Copy these totals into the shift's Tips and Sales"
              >
                Use as shift totals
              </Button>
            ) : null}
          </Flex>
        ) : null}
      </Flex>
    </Box>
  );
}

export default TablesEditor;
