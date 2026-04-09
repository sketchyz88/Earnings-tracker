import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  ChakraProvider,
  Flex,
  HStack,
  IconButton,
  SimpleGrid,
  Text,
  extendTheme,
} from '@chakra-ui/react';
import { Download, Plus, Settings, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import BiWeeklyHours from './components/BiWeeklyHours';
import CalendarView from './components/CalendarView';
import FloorComparison from './components/FloorComparison';
import SettingsDialog from './components/SettingsDialog';
import ShiftsByDay from './components/ShiftsByDay';

const STORAGE_KEYS = {
  shifts: 'earnings_tracker_shifts',
  settings: 'earnings_tracker_settings',
};

const DEFAULT_SETTINGS = {
  hourlyRate: 15,
  tipOutRate: 4.5,
  tipGoal: 100,
  hoursGoal: 80,
};

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: '#101726',
        color: 'white',
      },
    },
  },
});

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.shifts);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShifts(nextShifts) {
  localStorage.setItem(STORAGE_KEYS.shifts, JSON.stringify(nextShifts));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(nextSettings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(nextSettings));
}

function getBasePay(shift, hourlyRate) {
  const explicitEarnings = Number(shift.earnings);
  if (Number.isFinite(explicitEarnings) && explicitEarnings > 0) {
    return explicitEarnings;
  }

  const hours = Number(shift.hours) || 0;
  return hours * hourlyRate;
}

function getSales(shift) {
  return Number(shift.sales) || 0;
}

function getTipOutRateDecimal(settings) {
  return (Number(settings?.tipOutRate) || 0) / 100;
}

function getTipOut(shift, settings) {
  return getSales(shift) * getTipOutRateDecimal(settings);
}

function getNetTips(shift, settings) {
  return (Number(shift.tips) || 0) - getTipOut(shift, settings);
}

function computeStats(shifts, settings) {
  if (!shifts.length) {
    return {
      totalShifts: 0,
      totalHours: 0,
      totalSales: 0,
      totalTips: 0,
      totalTipOut: 0,
      totalNetTips: 0,
      totalBasePay: 0,
      totalTakeHome: 0,
      avgTipsPerHour: 0,
      avgTakeHomePerShift: 0,
    };
  }

  const totals = shifts.reduce(
    (accumulator, shift) => {
      const hours = Number(shift.hours) || 0;
      const sales = getSales(shift);
      const tips = Number(shift.tips) || 0;
      const tipOut = getTipOut(shift, settings);
      const netTips = tips - tipOut;
      const basePay = getBasePay(shift, settings.hourlyRate);

      return {
        totalShifts: accumulator.totalShifts + 1,
        totalHours: accumulator.totalHours + hours,
        totalSales: accumulator.totalSales + sales,
        totalTips: accumulator.totalTips + tips,
        totalTipOut: accumulator.totalTipOut + tipOut,
        totalNetTips: accumulator.totalNetTips + netTips,
        totalBasePay: accumulator.totalBasePay + basePay,
        totalTakeHome: accumulator.totalTakeHome + netTips + basePay,
      };
    },
    {
      totalShifts: 0,
      totalHours: 0,
      totalSales: 0,
      totalTips: 0,
      totalTipOut: 0,
      totalNetTips: 0,
      totalBasePay: 0,
      totalTakeHome: 0,
    }
  );

  return {
    ...totals,
    avgTipsPerHour: totals.totalHours > 0 ? totals.totalTips / totals.totalHours : 0,
    avgTakeHomePerShift:
      totals.totalShifts > 0 ? totals.totalTakeHome / totals.totalShifts : 0,
  };
}

function escapeCsvValue(value) {
  const normalized = value == null ? '' : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatDateLabel(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatCard({ icon: Icon, label, value, helper, accent }) {
  return (
    <Box
      bg="#1a2335"
      borderRadius="2xl"
      p={5}
      border="1px solid"
      borderColor="whiteAlpha.100"
      boxShadow="lg"
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
        <Box>
          <Text color={accent} fontSize="2xl" fontWeight="bold" lineHeight="shorter">
            {value}
          </Text>
          <Text mt={2} color="gray.300" fontSize="sm" fontWeight="semibold">
            {label}
          </Text>
          <Text mt={1} color="gray.500" fontSize="xs">
            {helper}
          </Text>
        </Box>

        <Box color={accent} opacity={0.8}>
          <Icon size={24} />
        </Box>
      </Flex>
    </Box>
  );
}

function App() {
  const [shifts, setShifts] = useState(loadShifts);
  const [settings, setSettings] = useState(loadSettings);
  const [view, setView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState('');
  const [editingShift, setEditingShift] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    saveShifts(shifts);
  }, [shifts]);

  const stats = useMemo(() => computeStats(shifts, settings), [settings, shifts]);

  const filteredShifts = useMemo(() => {
    if (!selectedDate) {
      return shifts;
    }

    return shifts.filter((shift) => shift.date === selectedDate);
  }, [selectedDate, shifts]);

  const sortedShifts = useMemo(
    () =>
      [...shifts].sort((left, right) => {
        return new Date(right.date) - new Date(left.date);
      }),
    [shifts]
  );

  const recentShift = sortedShifts[0];

  function closeShiftDialog() {
    setEditingShift(null);
    setIsAddOpen(false);
  }

  function openNewShiftDialog() {
    setEditingShift(null);
    setIsAddOpen(true);
  }

  function handleSaveShift(shiftInput) {
    setShifts((currentShifts) => {
      if (editingShift) {
        return currentShifts.map((shift) =>
          shift.id === editingShift.id ? { ...shiftInput, id: editingShift.id } : shift
        );
      }

      return [{ ...shiftInput, id: crypto.randomUUID() }, ...currentShifts];
    });

    closeShiftDialog();
  }

  function handleEditShift(shift) {
    setEditingShift(shift);
    setIsAddOpen(true);
  }

  function handleDeleteShift(id) {
    setShifts((currentShifts) => currentShifts.filter((shift) => shift.id !== id));
  }

  function handleSaveSettings(nextSettings) {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  }

  function handleExportCsv() {
    const rows = [
      ['Date', 'Start Time', 'End Time', 'Hours', 'Sales', 'Gross Tips', 'Tip Out', 'Net Tips', 'Base Pay', 'Total Take Home', 'Floor', 'Notes'],
      ...sortedShifts.map((shift) => {
        const tips = Number(shift.tips) || 0;
        const sales = getSales(shift);
        const tipOut = getTipOut(shift, settings);
        const netTips = getNetTips(shift, settings);
        const basePay = getBasePay(shift, settings.hourlyRate);

        return [
          shift.date,
          shift.startTime || '',
          shift.endTime || '',
          shift.hours,
          sales.toFixed(2),
          tips.toFixed(2),
          tipOut.toFixed(2),
          netTips.toFixed(2),
          basePay.toFixed(2),
          (netTips + basePay).toFixed(2),
          shift.floor || '',
          shift.notes || '',
        ];
      }),
    ];

    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'earnings-tracker-shifts.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleCalendarDateClick(dateString) {
    setSelectedDate(dateString);
    setView('byDay');
  }

  const navItems = [
    ['dashboard', 'Dashboard'],
    ['byDay', 'By Day'],
    ['biWeekly', 'Bi-Weekly'],
    ['floor', 'Floor'],
    ['calendar', 'Calendar'],
  ];

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="#101726">
        <Box
          bg="#0d1422"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          px={{ base: 4, md: 6 }}
          py={4}
        >
          <Flex
            maxW="1280px"
            mx="auto"
            align={{ base: 'flex-start', md: 'center' }}
            justify="space-between"
            gap={4}
            direction={{ base: 'column', md: 'row' }}
          >
            <Box>
              <Text fontSize="2xl" fontWeight="bold">
                Earnings Tracker
              </Text>
              <Text color="gray.400" fontSize="sm" mt={1}>
                Track shifts, monitor pay periods, and compare where your strongest tips come from.
              </Text>
            </Box>

            <HStack spacing={2} alignSelf={{ base: 'stretch', md: 'center' }}>
              <IconButton
                icon={<Settings size={16} />}
                variant="outline"
                borderColor="whiteAlpha.200"
                color="gray.100"
                aria-label="Open settings"
                onClick={() => setIsSettingsOpen(true)}
              />
              <Button
                leftIcon={<Download size={16} />}
                variant="outline"
                borderColor="whiteAlpha.200"
                color="gray.100"
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
              <Button
                leftIcon={<Plus size={16} />}
                colorScheme="teal"
                onClick={openNewShiftDialog}
              >
                Add Shift
              </Button>
            </HStack>
          </Flex>
        </Box>

        <Box
          bg="#0d1422"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          px={{ base: 4, md: 6 }}
          py={3}
        >
          <Flex maxW="1280px" mx="auto" gap={2} wrap="wrap">
            {navItems.map(([mode, label]) => {
              const isActive = view === mode;
              return (
                <Button
                  key={mode}
                  size="sm"
                  borderRadius="full"
                  bg={isActive ? 'teal.400' : 'transparent'}
                  color={isActive ? 'gray.900' : 'gray.300'}
                  _hover={{
                    bg: isActive ? 'teal.300' : 'whiteAlpha.100',
                    color: isActive ? 'gray.900' : 'white',
                  }}
                  onClick={() => setView(mode)}
                >
                  {label}
                </Button>
              );
            })}
          </Flex>
        </Box>

        <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }}>
          <Box maxW="1280px" mx="auto">
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={6}>
              <StatCard
                icon={TrendingUp}
                label="Net tips"
                value={formatCurrency(stats.totalNetTips)}
                helper={`${formatCurrency(stats.totalTipOut)} total tip-out removed`}
                accent="#68d391"
              />
              <StatCard
                icon={Wallet}
                label="Estimated take-home"
                value={formatCurrency(stats.totalTakeHome)}
                helper="Net tips plus base pay"
                accent="#7dd3fc"
              />
              <StatCard
                icon={TrendingDown}
                label="Tip-out paid"
                value={formatCurrency(stats.totalTipOut)}
                helper={`${settings.tipOutRate}% of ${formatCurrency(stats.totalSales)} sales over time`}
                accent="#fc8181"
              />
              <StatCard
                icon={Target}
                label="Average take-home"
                value={formatCurrency(stats.avgTakeHomePerShift)}
                helper={`Gross tips ${formatCurrency(stats.totalTips)} • ${stats.totalHours.toFixed(1)} hours`}
                accent="#f687b3"
              />
            </SimpleGrid>

            {selectedDate && view === 'byDay' ? (
              <Flex
                mb={4}
                p={4}
                bg="#182133"
                borderRadius="xl"
                border="1px solid"
                borderColor="whiteAlpha.100"
                align={{ base: 'flex-start', md: 'center' }}
                justify="space-between"
                direction={{ base: 'column', md: 'row' }}
                gap={3}
              >
                <Box>
                  <Text fontWeight="semibold">Filtered to {formatDateLabel(selectedDate)}</Text>
                  <Text color="gray.400" fontSize="sm">
                    Showing only the shifts from the date you selected in calendar view.
                  </Text>
                </Box>
                <Button variant="outline" onClick={() => setSelectedDate('')}>
                  Clear Filter
                </Button>
              </Flex>
            ) : null}

            {view === 'dashboard' ? (
              <Box display="grid" gap={6}>
                <BiWeeklyHours shifts={shifts} settings={settings} />
                <ShiftsByDay
                  shifts={sortedShifts.slice(0, 8)}
                  settings={settings}
                  onEdit={handleEditShift}
                  onDelete={handleDeleteShift}
                  title="Recent shifts"
                  badgeLabel={recentShift ? `Last shift ${formatDateLabel(recentShift.date)}` : '0 shifts'}
                  emptyTitle="No shifts logged yet."
                  emptySubtitle="Add your first shift and the dashboard will start filling in."
                />
              </Box>
            ) : null}

            {view === 'byDay' ? (
              <ShiftsByDay
                shifts={filteredShifts}
                settings={settings}
                onEdit={handleEditShift}
                onDelete={handleDeleteShift}
                title={selectedDate ? `Shifts on ${formatDateLabel(selectedDate)}` : 'All shifts'}
                badgeLabel={`${filteredShifts.length} ${filteredShifts.length === 1 ? 'shift' : 'shifts'}`}
                emptyTitle={selectedDate ? 'No shifts on this date.' : 'No shifts logged yet.'}
                emptySubtitle={
                  selectedDate
                    ? 'Pick another day from the calendar or clear the filter.'
                    : 'Add a shift to start building your history.'
                }
              />
            ) : null}

            {view === 'biWeekly' ? <BiWeeklyHours shifts={shifts} settings={settings} /> : null}
            {view === 'floor' ? <FloorComparison shifts={shifts} settings={settings} /> : null}
            {view === 'calendar' ? (
              <CalendarView
                shifts={shifts}
                selectedDate={selectedDate}
                onDateClick={handleCalendarDateClick}
              />
            ) : null}
          </Box>
        </Box>

        <AddShiftDialog
          isOpen={isAddOpen}
          onClose={closeShiftDialog}
          onSave={handleSaveShift}
          editingShift={editingShift}
          settings={settings}
        />

        <SettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          settings={settings}
        />
      </Box>
    </ChakraProvider>
  );
}

export default App;
