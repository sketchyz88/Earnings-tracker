import '@fontsource-variable/inter';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ChakraProvider,
  Flex,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  extendTheme,
} from '@chakra-ui/react';
import {
  Download,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import AboutView from './components/AboutView';
import AuthScreen from './components/AuthScreen';
import BiWeeklyHours, {
  DEFAULT_PAY_PERIOD_SETTINGS,
  buildPeriodSummary,
  getPeriodEnd,
  getPeriodKey,
  getPeriodStart,
  getPeriods,
  normalizePayPeriodSettings,
  parsePeriodKey,
} from './components/BiWeeklyHours';
import CalendarView from './components/CalendarView';
import FloorComparison from './components/FloorComparison';
import SettingsDialog from './components/SettingsDialog';
import ShiftsByDay from './components/ShiftsByDay';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  formatCompactCurrency,
  formatCurrency,
  formatHours,
  formatMultiplier,
  formatSignedCurrency,
  formatSignedPercent,
} from './utils/format';
import { ACCENTS, RADII, TABULAR, palette } from './theme/tokens';

const STORAGE_KEYS = {
  profiles: 'earnings_tracker_profiles_v1',
  activeProfileId: 'earnings_tracker_active_profile_id',
  legacyShifts: 'earnings_tracker_shifts',
  legacySettings: 'earnings_tracker_settings',
  uiMode: 'earnings_tracker_ui_mode',
};

const DEFAULT_JOB = {
  id: 'job-1',
  name: 'Primary Job',
};

const ALL_JOBS_VALUE = 'all-jobs';

function createDefaultJobs() {
  return [{ ...DEFAULT_JOB }];
}

const DEFAULT_SETTINGS = {
  hourlyRate: 15,
  tipOutRate: 4.5,
  tipGoal: 100,
  hoursGoal: 80,
  payPeriodLengthDays: DEFAULT_PAY_PERIOD_SETTINGS.payPeriodLengthDays,
  payPeriodAnchorDate: DEFAULT_PAY_PERIOD_SETTINGS.payPeriodAnchorDate,
  jobs: createDefaultJobs(),
};

const DEFAULT_PROFILE = {
  id: 'default-profile',
  name: 'My Profile',
};

function createTheme(uiMode) {
  const isDarkMode = uiMode === 'dark';
  const tokens = palette(isDarkMode);

  return extendTheme({
  config: {
    initialColorMode: isDarkMode ? 'dark' : 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  radii: {
    md: RADII.md,
    lg: RADII.lg,
    xl: RADII.xl,
    '2xl': RADII.xl,
    '3xl': RADII.xl,
  },
  colors: {
    brand: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  styles: {
    global: {
      body: {
        bg: tokens.canvas,
        color: tokens.text,
        backgroundImage: tokens.canvasGradient,
        backgroundAttachment: 'fixed',
        // Inter's contextual alternates and disambiguated glyphs; the app is
        // dense with digits, so legibility beats the default forms.
        fontFeatureSettings: `'cv02' 1, 'cv03' 1, 'cv04' 1, 'ss03' 1`,
        WebkitFontSmoothing: 'antialiased',
        letterSpacing: '-0.011em',
      },
      // Any element rendering a figure gets lining tabular numerals so columns
      // align and in-place updates don't shift width.
      '[data-numeric]': TABULAR,
      '*::placeholder': {
        color: tokens.textSubtle,
      },
      '*:focus-visible': {
        outline: `2px solid ${ACCENTS.primary}`,
        outlineOffset: '2px',
        boxShadow: 'none',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: RADII.md,
        fontWeight: 600,
        letterSpacing: '-0.006em',
        transition: 'background-color 120ms ease, border-color 120ms ease, transform 120ms ease',
        _active: { transform: 'translateY(1px)' },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: tokens.surfaceSunken,
            borderRadius: RADII.md,
            borderColor: tokens.border,
            color: tokens.text,
            _hover: {
              borderColor: tokens.borderStrong,
            },
            _focusVisible: {
              borderColor: ACCENTS.primary,
              boxShadow: `0 0 0 3px ${ACCENTS.primaryMuted}`,
            },
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: tokens.surfaceSunken,
            borderRadius: RADII.md,
            borderColor: tokens.border,
            color: tokens.text,
            _hover: {
              borderColor: tokens.borderStrong,
            },
            _focusVisible: {
              borderColor: ACCENTS.primary,
              boxShadow: `0 0 0 3px ${ACCENTS.primaryMuted}`,
            },
          },
          icon: {
            color: tokens.textMuted,
          },
        },
      },
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
            bg: tokens.surfaceSunken,
            borderRadius: RADII.md,
            borderColor: tokens.border,
            color: tokens.text,
            _hover: {
              borderColor: tokens.borderStrong,
            },
            _focusVisible: {
              borderColor: ACCENTS.primary,
              boxShadow: `0 0 0 3px ${ACCENTS.primaryMuted}`,
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: isDarkMode ? '#111827' : '#fcfbf8',
          borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(22, 33, 43, 0.12)',
          color: isDarkMode ? '#e5e7eb' : '#16212b',
          _hover: {
            borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.28)' : 'rgba(22, 33, 43, 0.22)',
          },
          _focusVisible: {
            borderColor: '#7aa88b',
            boxShadow: '0 0 0 1px #7aa88b',
          },
        },
      },
    },
  },
});
}

function loadUiMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.uiMode);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.legacyShifts);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.legacySettings);
    return raw ? normalizeSettings(JSON.parse(raw)) : createDefaultSettings();
  } catch {
    return createDefaultSettings();
  }
}

function createEmptyProfileData() {
  return {
    shifts: [],
    settings: createDefaultSettings(),
  };
}

function createDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    jobs: createDefaultJobs(),
  };
}

function normalizeJobs(rawJobs) {
  if (!Array.isArray(rawJobs) || !rawJobs.length) {
    return createDefaultJobs();
  }

  const usedIds = new Set();
  const normalizedJobs = rawJobs.reduce((jobs, rawJob, index) => {
    const baseId =
      typeof rawJob?.id === 'string' && rawJob.id.trim() ? rawJob.id.trim() : `job-${index + 1}`;
    let nextId = baseId;
    let duplicateIndex = 2;

    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    usedIds.add(nextId);

    jobs.push({
      id: nextId,
      name:
        typeof rawJob?.name === 'string' && rawJob.name.trim()
          ? rawJob.name.trim()
          : `Job ${index + 1}`,
    });

    return jobs;
  }, []);

  return normalizedJobs.length ? normalizedJobs : createDefaultJobs();
}

function getDefaultJobId(jobs) {
  return normalizeJobs(jobs)[0]?.id || DEFAULT_JOB.id;
}

function getJobName(jobId, jobs) {
  return normalizeJobs(jobs).find((job) => job.id === jobId)?.name || 'Unknown Job';
}

function normalizeSettings(rawSettings = {}) {
  const payPeriodSettings = normalizePayPeriodSettings(rawSettings);

  return {
    hourlyRate: Number(rawSettings?.hourlyRate) || DEFAULT_SETTINGS.hourlyRate,
    tipOutRate: Number(rawSettings?.tipOutRate) || DEFAULT_SETTINGS.tipOutRate,
    tipGoal: Number(rawSettings?.tipGoal) || DEFAULT_SETTINGS.tipGoal,
    hoursGoal: Number(rawSettings?.hoursGoal) || DEFAULT_SETTINGS.hoursGoal,
    payPeriodLengthDays: payPeriodSettings.payPeriodLengthDays,
    payPeriodAnchorDate: payPeriodSettings.payPeriodAnchorDate,
    jobs: normalizeJobs(rawSettings?.jobs),
  };
}

function loadProfileStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profiles);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.profiles?.length && parsed?.dataById) {
        return parsed;
      }
    }
  } catch {
    // Fall back to migrating legacy storage.
  }

  return {
    profiles: [DEFAULT_PROFILE],
    dataById: {
      [DEFAULT_PROFILE.id]: {
        shifts: loadShifts(),
        settings: loadSettings(),
      },
    },
  };
}

function saveProfileStore(nextStore) {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(nextStore));
}

function loadActiveProfileId(fallbackProfileId) {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeProfileId) || fallbackProfileId;
  } catch {
    return fallbackProfileId;
  }
}

function saveActiveProfileId(profileId) {
  localStorage.setItem(STORAGE_KEYS.activeProfileId, profileId);
}

function slugifyProfileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sortShiftsNewestFirst(shifts) {
  return [...shifts].sort((left, right) => new Date(right.date) - new Date(left.date));
}

function getLocalActiveDataset(profileStore, activeProfileId) {
  const profiles = profileStore?.profiles || [DEFAULT_PROFILE];
  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) || profiles[0] || DEFAULT_PROFILE;
  const activeProfileData = profileStore?.dataById?.[activeProfile.id] || createEmptyProfileData();
  const settings = normalizeSettings(activeProfileData.settings || {});
  const defaultJobId = getDefaultJobId(settings.jobs);

  return {
    profileName: activeProfile.name || DEFAULT_PROFILE.name,
    shifts: sortShiftsNewestFirst(
      (activeProfileData.shifts || []).map((shift) => ({
        ...shift,
        jobId: shift.jobId || defaultJobId,
      }))
    ),
    settings,
  };
}

function getDefaultProfileName(user, settingsRow) {
  return (
    settingsRow?.display_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    DEFAULT_PROFILE.name
  );
}

function normalizeSettingsRow(settingsRow, user) {
  return {
    profileName: getDefaultProfileName(user, settingsRow),
    settings: normalizeSettings({
      hourlyRate: Number(settingsRow?.hourly_rate) || DEFAULT_SETTINGS.hourlyRate,
      tipOutRate: Number(settingsRow?.tip_out_rate) || DEFAULT_SETTINGS.tipOutRate,
      tipGoal: Number(settingsRow?.tip_goal) || DEFAULT_SETTINGS.tipGoal,
      hoursGoal: Number(settingsRow?.hours_goal) || DEFAULT_SETTINGS.hoursGoal,
      payPeriodLengthDays: settingsRow?.pay_period_length_days,
      payPeriodAnchorDate: settingsRow?.pay_period_anchor_date,
      jobs: settingsRow?.jobs,
    }),
  };
}

function normalizeShiftRow(shiftRow, jobs) {
  return {
    id: shiftRow.id,
    date: shiftRow.shift_date,
    startTime: shiftRow.start_time || '',
    endTime: shiftRow.end_time || '',
    hours: Number(shiftRow.hours) || 0,
    sales: Number(shiftRow.sales) || 0,
    tips: Number(shiftRow.tips) || 0,
    earnings: Number(shiftRow.earnings) || 0,
    floor: shiftRow.floor || '',
    notes: shiftRow.notes || '',
    jobId: shiftRow.job_id || getDefaultJobId(jobs),
  };
}

function serializeShift(shift, userId) {
  return {
    id: shift.id || crypto.randomUUID(),
    user_id: userId,
    shift_date: shift.date,
    start_time: shift.startTime || null,
    end_time: shift.endTime || null,
    hours: Number(shift.hours) || 0,
    sales: Number(shift.sales) || 0,
    tips: Number(shift.tips) || 0,
    earnings: Number(shift.earnings) || 0,
    floor: shift.floor || null,
    notes: shift.notes || '',
    job_id: shift.jobId || null,
  };
}

function serializeSettings(settings, userId, profileName) {
  const normalizedSettings = normalizeSettings(settings);
  const payPeriodSettings = normalizePayPeriodSettings(normalizedSettings);

  return {
    user_id: userId,
    display_name: profileName,
    hourly_rate: Number(normalizedSettings.hourlyRate) || DEFAULT_SETTINGS.hourlyRate,
    tip_out_rate: Number(normalizedSettings.tipOutRate) || DEFAULT_SETTINGS.tipOutRate,
    tip_goal: Number(normalizedSettings.tipGoal) || DEFAULT_SETTINGS.tipGoal,
    hours_goal: Number(normalizedSettings.hoursGoal) || DEFAULT_SETTINGS.hoursGoal,
    pay_period_length_days: payPeriodSettings.payPeriodLengthDays,
    pay_period_anchor_date: payPeriodSettings.payPeriodAnchorDate,
    jobs: normalizedSettings.jobs,
  };
}

function hasLocalDataToImport(dataset) {
  const hasShifts = Boolean(dataset.shifts.length);
  const hasCustomSettings = Object.entries(DEFAULT_SETTINGS).some(([key, defaultValue]) => {
    const currentValue = dataset.settings[key];

    if (Array.isArray(defaultValue) || typeof defaultValue === 'object') {
      return JSON.stringify(currentValue ?? null) !== JSON.stringify(defaultValue);
    }

    if (typeof defaultValue === 'string') {
      return (currentValue || '') !== defaultValue;
    }

    return Number(currentValue) !== Number(defaultValue);
  });

  return hasShifts || hasCustomSettings;
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

function formatDateLabel(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return `${startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
}

function CardShell({ isDarkMode, accent, raised = false, children, ...rest }) {
  const tokens = palette(isDarkMode);
  return (
    <Box
      position="relative"
      overflow="hidden"
      bg={raised ? tokens.surfaceRaised : tokens.surface}
      backdropFilter="blur(12px)"
      borderRadius={RADII.xl}
      border="1px solid"
      borderColor={tokens.border}
      boxShadow={raised ? tokens.shadowRaised : tokens.shadow}
      transition="border-color 160ms ease, box-shadow 160ms ease"
      _hover={{ borderColor: tokens.borderStrong }}
      {...rest}
    >
      {accent ? (
        <Box
          position="absolute"
          insetX={0}
          top={0}
          height="1px"
          bgGradient={`linear(to-r, transparent, ${accent}, transparent)`}
        />
      ) : null}
      {children}
    </Box>
  );
}

function CardLabel({ isDarkMode, children }) {
  const tokens = palette(isDarkMode);
  return (
    <Text
      color={tokens.textMuted}
      fontSize="11px"
      fontWeight={600}
      letterSpacing="0.08em"
      textTransform="uppercase"
    >
      {children}
    </Text>
  );
}

function SnapshotCard({
  isDarkMode,
  label,
  title,
  value,
  detail,
  helper,
  accent,
  metrics = [],
}) {
  const tokens = palette(isDarkMode);

  return (
    <CardShell isDarkMode={isDarkMode} accent={accent} raised p={{ base: 5, md: 6 }}>
      <Flex justify="space-between" align="baseline" gap={4} wrap="wrap">
        <CardLabel isDarkMode={isDarkMode}>{label}</CardLabel>
        <Text color={tokens.textMuted} fontSize="sm" data-numeric>
          {title}
        </Text>
      </Flex>

      <Text
        mt={3}
        color={tokens.text}
        fontSize={{ base: '40px', md: '52px' }}
        fontWeight={700}
        lineHeight="1"
        letterSpacing="-0.03em"
        data-numeric
      >
        {value}
      </Text>
      {detail ? (
        <Text mt={2.5} color={tokens.textMuted} fontSize="sm" data-numeric>
          {detail}
        </Text>
      ) : null}

      {metrics.length ? (
        <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={0} mt={6}>
          {metrics.map((metric, index) => (
            <Box
              key={metric.label}
              pl={{ base: index % 2 === 0 ? 0 : 5, lg: index === 0 ? 0 : 5 }}
              pr={{ base: 3, lg: 4 }}
              py={1}
              borderLeft={{
                base: index % 2 === 0 ? 'none' : '1px solid',
                lg: index === 0 ? 'none' : '1px solid',
              }}
              borderColor={tokens.border}
              mt={{ base: index > 1 ? 5 : 0, lg: 0 }}
            >
              <CardLabel isDarkMode={isDarkMode}>{metric.label}</CardLabel>
              <Text
                mt={1.5}
                color={tokens.text}
                fontSize="22px"
                fontWeight={600}
                letterSpacing="-0.02em"
                data-numeric
              >
                {metric.value}
              </Text>
              <Text mt={0.5} color={tokens.textSubtle} fontSize="xs" lineHeight="1.45">
                {metric.helper}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}

      {helper ? (
        <Box mt={6} pt={4} borderTop="1px solid" borderColor={tokens.border}>
          <Text color={tokens.textMuted} fontSize="sm" lineHeight="1.6">
            {helper}
          </Text>
        </Box>
      ) : null}
    </CardShell>
  );
}

function EmptyPeriodCard({ isDarkMode, periodLabel, lastPeriod, onAddShift }) {
  const tokens = palette(isDarkMode);
  return (
    <CardShell isDarkMode={isDarkMode} accent={ACCENTS.primary} raised p={{ base: 5, md: 6 }}>
      <CardLabel isDarkMode={isDarkMode}>Current pay period</CardLabel>
      <Text
        mt={3}
        color={tokens.text}
        fontSize={{ base: '26px', md: '30px' }}
        fontWeight={650}
        lineHeight="1.15"
        letterSpacing="-0.025em"
        data-numeric
      >
        No shifts logged yet in {periodLabel}
      </Text>
      <Text mt={2.5} color={tokens.textMuted} fontSize="sm" lineHeight="1.6" maxW="52ch">
        {lastPeriod
          ? `Your last period with shifts, ${lastPeriod.label}, finished at ${formatCurrency(
              lastPeriod.totalTakeHome
            )} take-home across ${lastPeriod.shifts} ${
              lastPeriod.shifts === 1 ? 'shift' : 'shifts'
            }. This period's numbers will fill in as you log.`
          : 'Log your first shift and this dashboard will start tracking hours, tip-out, and what you actually keep.'}
      </Text>

      {lastPeriod ? (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={0} mt={6}>
          {[
            { label: 'Hours', value: formatHours(lastPeriod.hours) },
            { label: 'Sales', value: formatCurrency(lastPeriod.sales) },
            { label: 'Net tips', value: formatCurrency(lastPeriod.netTips) },
            { label: 'Take-home', value: formatCurrency(lastPeriod.totalTakeHome) },
          ].map((metric, index) => (
            <Box
              key={metric.label}
              pl={{ base: index % 2 === 0 ? 0 : 5, md: index === 0 ? 0 : 5 }}
              pr={{ base: 3, md: 4 }}
              mt={{ base: index > 1 ? 5 : 0, md: 0 }}
              borderLeft={{
                base: index % 2 === 0 ? 'none' : '1px solid',
                md: index === 0 ? 'none' : '1px solid',
              }}
              borderColor={tokens.border}
            >
              <CardLabel isDarkMode={isDarkMode}>{metric.label}</CardLabel>
              <Text
                mt={1.5}
                color={tokens.textMuted}
                fontSize="20px"
                fontWeight={600}
                letterSpacing="-0.02em"
                data-numeric
              >
                {metric.value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}

      <Box mt={6} pt={4} borderTop="1px solid" borderColor={tokens.border}>
        <Button
          leftIcon={<Plus size={16} />}
          bg={ACCENTS.primary}
          color="white"
          size="sm"
          _hover={{ bg: '#2f6fd0' }}
          onClick={onAddShift}
        >
          Log a shift
        </Button>
        {lastPeriod ? (
          <Text as="span" ml={3} color={tokens.textSubtle} fontSize="xs" data-numeric>
            Figures above are from {lastPeriod.label}
          </Text>
        ) : null}
      </Box>
    </CardShell>
  );
}

function SummaryCard({ icon: Icon, isDarkMode, label, value, helper, accent }) {
  const tokens = palette(isDarkMode);
  return (
    <CardShell isDarkMode={isDarkMode} p={5} height="100%">
      <Flex justify="space-between" align="flex-start" gap={3}>
        <Box minW={0}>
          <CardLabel isDarkMode={isDarkMode}>{label}</CardLabel>
          <Text
            mt={2}
            color={tokens.text}
            fontSize="28px"
            fontWeight={650}
            lineHeight="1.1"
            letterSpacing="-0.025em"
            data-numeric
          >
            {value}
          </Text>
        </Box>
        <Flex
          color={accent}
          bg={`${accent}1a`}
          borderRadius={RADII.md}
          boxSize="34px"
          align="center"
          justify="center"
          flexShrink={0}
        >
          <Icon size={17} strokeWidth={2.2} />
        </Flex>
      </Flex>
      <Text mt={2.5} color={tokens.textMuted} fontSize="13px" lineHeight="1.55" data-numeric>
        {helper}
      </Text>
    </CardShell>
  );
}

function InsightCard({ isDarkMode, label, title, helper, accent }) {
  const tokens = palette(isDarkMode);
  return (
    <CardShell isDarkMode={isDarkMode} accent={accent} p={5} height="100%">
      <CardLabel isDarkMode={isDarkMode}>{label}</CardLabel>
      <Text
        mt={2}
        color={tokens.text}
        fontSize="19px"
        fontWeight={650}
        lineHeight="1.25"
        letterSpacing="-0.02em"
        data-numeric
      >
        {title}
      </Text>
      <Text mt={2} color={tokens.textMuted} fontSize="13px" lineHeight="1.55" data-numeric>
        {helper}
      </Text>
    </CardShell>
  );
}

async function fetchCloudData(user) {
  const [{ data: settingsRow, error: settingsError }, { data: shiftRows, error: shiftsError }] =
    await Promise.all([
      supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('shift_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

  if (settingsError) {
    throw settingsError;
  }

  if (shiftsError) {
    throw shiftsError;
  }

  const normalizedSettings = normalizeSettingsRow(settingsRow, user);
  const normalizedShiftRows = (shiftRows || []).map((shiftRow) =>
    normalizeShiftRow(shiftRow, normalizedSettings.settings.jobs)
  );

  return {
    profileName: normalizedSettings.profileName,
    shifts: normalizedShiftRows,
    settings: normalizedSettings.settings,
  };
}

function App() {
  const [uiMode, setUiMode] = useState(loadUiMode);
  const initialLocalStore = loadProfileStore();
  const [profileStore, setProfileStore] = useState(initialLocalStore);
  const [activeProfileId, setActiveProfileId] = useState(() =>
    loadActiveProfileId(initialLocalStore.profiles[0]?.id || DEFAULT_PROFILE.id)
  );
  const [session, setSession] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(!isSupabaseConfigured);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudProfileName, setCloudProfileName] = useState(DEFAULT_PROFILE.name);
  const [cloudProfileData, setCloudProfileData] = useState(createEmptyProfileData());
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isImportingLocalData, setIsImportingLocalData] = useState(false);
  const [view, setView] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(ALL_JOBS_VALUE);
  const [selectedDate, setSelectedDate] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('all');
  const [historyFilterValue, setHistoryFilterValue] = useState('');
  const [historyCustomDays, setHistoryCustomDays] = useState('14');
  const [editingShift, setEditingShift] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastDeletedShift, setLastDeletedShift] = useState(null);
  const isDarkMode = uiMode === 'dark';
  const themeTokens = palette(isDarkMode);
  const theme = useMemo(() => createTheme(uiMode), [uiMode]);
  const deleteUndoTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.uiMode, uiMode);
    } catch {
      // ignore persistence errors
    }
  }, [uiMode]);

  useEffect(() => {
    return () => {
      if (deleteUndoTimeoutRef.current) {
        clearTimeout(deleteUndoTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    saveProfileStore(profileStore);
  }, [profileStore]);

  useEffect(() => {
    saveActiveProfileId(activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setAuthError(error.message);
        }

        setSession(data.session || null);
        setIsAuthReady(true);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setAuthError(error.message || 'Unable to check your sign-in session.');
        setIsAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user) {
      setCloudProfileName(DEFAULT_PROFILE.name);
      setCloudProfileData(createEmptyProfileData());
      setCloudError('');
      return;
    }

    let isMounted = true;

    setIsCloudLoading(true);
    setCloudError('');

    fetchCloudData(session.user)
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setCloudProfileName(result.profileName);
        setCloudProfileData({
          shifts: result.shifts,
          settings: result.settings,
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setCloudError(error.message || 'Unable to load your synced account.');
      })
      .finally(() => {
        if (isMounted) {
          setIsCloudLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const localDataset = useMemo(
    () => getLocalActiveDataset(profileStore, activeProfileId),
    [profileStore, activeProfileId]
  );

  const isCloudMode = Boolean(isSupabaseConfigured && session?.user);
  const profileName = isCloudMode ? cloudProfileName : localDataset.profileName;
  const shifts = isCloudMode ? cloudProfileData.shifts || [] : localDataset.shifts;
  const baseSettings = useMemo(
    () =>
      normalizeSettings(
        isCloudMode ? cloudProfileData.settings || createDefaultSettings() : localDataset.settings
      ),
    [cloudProfileData.settings, isCloudMode, localDataset.settings]
  );
  const jobs = useMemo(() => {
    const configuredJobs = normalizeJobs(baseSettings.jobs);
    const knownJobIds = new Set(configuredJobs.map((job) => job.id));
    const recoveredJobs = [];

    shifts.forEach((shift) => {
      if (shift.jobId && !knownJobIds.has(shift.jobId)) {
        knownJobIds.add(shift.jobId);
        recoveredJobs.push({
          id: shift.jobId,
          name: `Saved Job ${recoveredJobs.length + 1}`,
        });
      }
    });

    return [...configuredJobs, ...recoveredJobs];
  }, [baseSettings.jobs, shifts]);
  const settings = useMemo(
    () => ({
      ...baseSettings,
      jobs,
    }),
    [baseSettings, jobs]
  );
  const selectedJob =
    selectedJobId === ALL_JOBS_VALUE ? null : jobs.find((job) => job.id === selectedJobId) || null;
  const filteredByJobShifts = useMemo(() => {
    if (selectedJobId === ALL_JOBS_VALUE) {
      return shifts;
    }

    return shifts.filter((shift) => shift.jobId === selectedJobId);
  }, [selectedJobId, shifts]);

  const canImportLocalData =
    isCloudMode && !cloudProfileData.shifts.length && hasLocalDataToImport(localDataset);

  useEffect(() => {
    if (selectedJobId !== ALL_JOBS_VALUE && !jobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(ALL_JOBS_VALUE);
    }
  }, [jobs, selectedJobId]);

  const payPeriods = useMemo(
    () =>
      getPeriods(
        filteredByJobShifts || [],
        settings?.hourlyRate || 0,
        settings?.tipOutRate || 0,
        settings
      ),
    [filteredByJobShifts, settings, settings?.hourlyRate, settings?.tipOutRate]
  );

  const payPeriodStats = useMemo(() => {
    const todayPeriodStart = getPeriodStart(new Date(), settings);
    const todayPeriodKey = getPeriodKey(todayPeriodStart);
    const selectedPeriod =
      historyFilterType === 'payPeriod' && historyFilterValue
        ? payPeriods.find((period) => period.key === historyFilterValue)
        : null;
    const activePeriod =
      selectedPeriod ||
      payPeriods.find((period) => period.key === todayPeriodKey) ||
      buildPeriodSummary(
        todayPeriodStart,
        [],
        settings?.hourlyRate || 0,
        settings?.tipOutRate || 0,
        settings
      );

    return activePeriod;
  }, [
    historyFilterType,
    historyFilterValue,
    payPeriods,
    settings,
    settings?.hourlyRate,
    settings?.tipOutRate,
  ]);

  const payPeriodComparison = useMemo(() => {
    if (!payPeriods.length) {
      return {
        label: 'No prior period',
        takeHomeDelta: 0,
        takeHomeDeltaPercent: 0,
        tipsDelta: 0,
        salesDelta: 0,
        previousTakeHome: 0,
        helper: 'Log another pay period to compare trends over time.',
      };
    }

    const currentIndex = payPeriods.findIndex((period) => period.key === payPeriodStats.key);
    const previousPeriod = currentIndex > 0 ? payPeriods[currentIndex - 1] : null;

    if (!previousPeriod) {
      return {
        label: 'First saved period',
        takeHomeDelta: 0,
        takeHomeDeltaPercent: 0,
        tipsDelta: 0,
        salesDelta: 0,
        previousTakeHome: 0,
        helper: 'This is the first pay period in your saved history so far.',
      };
    }

    const takeHomeDelta = payPeriodStats.totalTakeHome - previousPeriod.totalTakeHome;
    const tipsDelta = payPeriodStats.netTips - previousPeriod.netTips;
    const salesDelta = payPeriodStats.sales - previousPeriod.sales;
    const takeHomeDeltaPercent =
      previousPeriod.totalTakeHome > 0
        ? (takeHomeDelta / previousPeriod.totalTakeHome) * 100
        : 0;

    return {
      label: `vs ${previousPeriod.label}`,
      takeHomeDelta,
      takeHomeDeltaPercent,
      tipsDelta,
      salesDelta,
      previousTakeHome: previousPeriod.totalTakeHome,
      helper:
        takeHomeDelta >= 0
          ? 'You are ahead of the previous pay period right now.'
          : 'You are trailing the previous pay period right now.',
    };
  }, [payPeriods, payPeriodStats]);

  const payPeriodForecast = useMemo(() => {
    const periodStart = parsePeriodKey(payPeriodStats.key);
    const periodEnd = getPeriodEnd(periodStart, settings);
    const today = new Date();
    const clampedToday = today < periodStart ? periodStart : today > periodEnd ? periodEnd : today;
    const totalDays =
      Math.max(1, Math.round((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1);
    const elapsedDays =
      Math.max(1, Math.round((clampedToday - periodStart) / (1000 * 60 * 60 * 24)) + 1);
    const completionRatio = Math.min(1, elapsedDays / totalDays);
    const projectedTakeHome =
      completionRatio > 0 ? payPeriodStats.totalTakeHome / completionRatio : payPeriodStats.totalTakeHome;
    const projectedNetTips =
      completionRatio > 0 ? payPeriodStats.netTips / completionRatio : payPeriodStats.netTips;

    return {
      elapsedDays,
      totalDays,
      completionRatio,
      projectedTakeHome,
      projectedNetTips,
      projectedShiftCount:
        completionRatio > 0 ? Math.max(payPeriodStats.shifts, payPeriodStats.shifts / completionRatio) : payPeriodStats.shifts,
    };
  }, [payPeriodStats, settings]);

  const sortedShifts = useMemo(
    () => sortShiftsNewestFirst(filteredByJobShifts),
    [filteredByJobShifts]
  );
  const recentShift = sortedShifts[0];

  const dashboardInsights = useMemo(() => {
    const effectiveHourly =
      payPeriodStats.hours > 0 ? payPeriodStats.totalTakeHome / payPeriodStats.hours : 0;
    const netTipRate = payPeriodStats.tipOut > 0 ? payPeriodStats.netTips / payPeriodStats.tipOut : 0;
    const bestShift = sortedShifts.reduce((best, shift) => {
      const shiftTakeHome = getNetTips(shift, settings) + getBasePay(shift, settings.hourlyRate);
      if (!best || shiftTakeHome > best.takeHome) {
        return {
          takeHome: shiftTakeHome,
          date: shift.date,
          sales: getSales(shift),
        };
      }
      return best;
    }, null);

    return {
      effectiveHourly,
      netTipRate,
      bestShift,
    };
  }, [payPeriodStats, settings, sortedShifts]);
  const yearlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearShifts = filteredByJobShifts.filter((shift) => {
      if (!shift.date) {
        return false;
      }

      return new Date(`${shift.date}T00:00:00`).getFullYear() === currentYear;
    });

    return {
      year: currentYear,
      ...computeStats(yearShifts, settings),
    };
  }, [filteredByJobShifts, settings]);

  const monthOptions = useMemo(() => {
    const seen = new Map();
    filteredByJobShifts.forEach((shift) => {
      if (!shift.date) {
        return;
      }
      const key = shift.date.slice(0, 7);
      if (!seen.has(key)) {
        const date = new Date(`${key}-01T00:00:00`);
        seen.set(
          key,
          `${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getFullYear()}`
        );
      }
    });
    return Array.from(seen.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([value, label]) => ({ value, label }));
  }, [filteredByJobShifts]);

  const weekOptions = useMemo(() => {
    const seen = new Map();
    filteredByJobShifts.forEach((shift) => {
      if (!shift.date) {
        return;
      }
      const weekStart = startOfWeek(shift.date);
      const key = weekStart.toISOString();
      if (!seen.has(key)) {
        seen.set(key, formatWeekLabel(weekStart));
      }
    });
    return Array.from(seen.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([value, label]) => ({ value, label }));
  }, [filteredByJobShifts]);

  const payPeriodOptions = useMemo(
    () =>
      payPeriods
        .slice()
        .reverse()
        .map((period) => ({ value: period.key, label: period.label })),
    [payPeriods]
  );

  const selectedHistoryDays = useMemo(() => {
    if (historyFilterType !== 'days') {
      return 0;
    }

    if (historyFilterValue === 'custom') {
      const parsed = Number(historyCustomDays);
      return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 14;
    }

    const parsed = Number(historyFilterValue);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 14;
  }, [historyCustomDays, historyFilterType, historyFilterValue]);

  const filteredShifts = useMemo(() => {
    if (!selectedDate) {
      if (historyFilterType === 'days') {
        const totalDays = selectedHistoryDays;
        const rangeEnd = startOfDay(new Date());
        const rangeStart = new Date(rangeEnd);
        rangeStart.setDate(rangeStart.getDate() - (totalDays - 1));

        return filteredByJobShifts.filter((shift) => {
          if (!shift.date) {
            return false;
          }

          const shiftDate = startOfDay(`${shift.date}T00:00:00`);
          return shiftDate >= rangeStart && shiftDate <= rangeEnd;
        });
      }

      if (historyFilterType === 'month' && historyFilterValue) {
        return filteredByJobShifts.filter((shift) => shift.date?.startsWith(historyFilterValue));
      }

      if (historyFilterType === 'week' && historyFilterValue) {
        return filteredByJobShifts.filter(
          (shift) => startOfWeek(shift.date).toISOString() === historyFilterValue
        );
      }

      if (historyFilterType === 'payPeriod' && historyFilterValue) {
        const selectedPeriod = payPeriods.find((period) => period.key === historyFilterValue);

        if (!selectedPeriod) {
          return [];
        }

        const periodStart = parsePeriodKey(selectedPeriod.key);
        const periodEnd = getPeriodEnd(periodStart, settings);

        return filteredByJobShifts.filter((shift) => {
          const shiftDate = new Date(`${shift.date}T00:00:00`);
          return shiftDate >= periodStart && shiftDate <= periodEnd;
        });
      }

      return filteredByJobShifts;
    }

    return filteredByJobShifts.filter((shift) => shift.date === selectedDate);
  }, [
    filteredByJobShifts,
    historyFilterType,
    historyFilterValue,
    payPeriods,
    selectedHistoryDays,
    selectedDate,
    settings,
    settings?.hourlyRate,
    settings?.tipOutRate,
  ]);
  const activeHistoryLabel = useMemo(() => {
    if (selectedDate) {
      return `Filtered to ${formatDateLabel(selectedDate)}`;
    }

    if (historyFilterType === 'days') {
      return `Filtered to last ${selectedHistoryDays} day${selectedHistoryDays === 1 ? '' : 's'}`;
    }

    if (historyFilterType === 'month' && historyFilterValue) {
      return `Filtered to ${
        monthOptions.find((option) => option.value === historyFilterValue)?.label || historyFilterValue
      }`;
    }

    if (historyFilterType === 'week' && historyFilterValue) {
      return `Filtered to week ${
        weekOptions.find((option) => option.value === historyFilterValue)?.label || historyFilterValue
      }`;
    }

    if (historyFilterType === 'payPeriod' && historyFilterValue) {
      return `Filtered to pay period ${
        payPeriodOptions.find((option) => option.value === historyFilterValue)?.label ||
        historyFilterValue
      }`;
    }

    return '';
  }, [
    historyFilterType,
    historyFilterValue,
    monthOptions,
    payPeriodOptions,
    selectedHistoryDays,
    selectedDate,
    weekOptions,
  ]);

  // The current pay period is frequently empty (a new period starts every two
  // weeks). Rather than render a screen of $0.00, fall back to the most recent
  // period that has shifts so the empty state can say something useful.
  const lastLoggedPeriod = useMemo(() => {
    return (
      [...payPeriods]
        .reverse()
        .find((period) => period.key !== payPeriodStats.key && period.shifts > 0) || null
    );
  }, [payPeriods, payPeriodStats.key]);

  const topSummary = useMemo(() => {
    if (historyFilterType === 'payPeriod' && historyFilterValue) {
      return {
        modeLabel: 'Selected pay period',
        title: payPeriodStats.label,
        helper: 'These totals are following the pay period you picked, so the hero stays in sync with your filter.',
        takeHome: payPeriodStats.totalTakeHome,
        netTips: payPeriodStats.netTips,
        tipOut: payPeriodStats.tipOut,
        hours: payPeriodStats.hours,
        sales: payPeriodStats.sales,
        basePay: payPeriodStats.basePay,
        shifts: payPeriodStats.shifts,
      };
    }

    return {
      modeLabel: 'Current pay period',
      title: payPeriodStats.label,
      helper: '',
      takeHome: payPeriodStats.totalTakeHome,
      netTips: payPeriodStats.netTips,
      tipOut: payPeriodStats.tipOut,
      hours: payPeriodStats.hours,
      sales: payPeriodStats.sales,
      basePay: payPeriodStats.basePay,
      shifts: payPeriodStats.shifts,
    };
  }, [historyFilterType, historyFilterValue, payPeriodStats]);

  function closeShiftDialog() {
    setEditingShift(null);
    setIsAddOpen(false);
  }

  function openNewShiftDialog() {
    setEditingShift(null);
    setIsAddOpen(true);
  }

  function updateActiveProfileData(updater) {
    setProfileStore((currentStore) => {
      const currentProfileData =
        currentStore.dataById[activeProfileId] || createEmptyProfileData();
      const nextProfileData = updater(currentProfileData);

      return {
        ...currentStore,
        dataById: {
          ...currentStore.dataById,
          [activeProfileId]: nextProfileData,
        },
      };
    });
  }

  async function handleSaveShift(shiftInput) {
    if (isCloudMode) {
      try {
        setCloudError('');
        const payload = serializeShift(
          {
            ...shiftInput,
            id: editingShift?.id,
          },
          session.user.id
        );

        const query = editingShift
          ? supabase
              .from('shifts')
              .update(payload)
              .eq('id', editingShift.id)
              .eq('user_id', session.user.id)
          : supabase.from('shifts').insert(payload);

        const { data, error } = await query.select().single();

        if (error) {
          throw error;
        }

        const savedShift = normalizeShiftRow(data, jobs);

        setCloudProfileData((currentData) => {
          const nextShifts = editingShift
            ? currentData.shifts.map((shift) => (shift.id === editingShift.id ? savedShift : shift))
            : [savedShift, ...currentData.shifts];

          return {
            ...currentData,
            shifts: sortShiftsNewestFirst(nextShifts),
          };
        });

        closeShiftDialog();
        return true;
      } catch (error) {
        setCloudError(error.message || 'Unable to save this shift.');
        return false;
      }

      return false;
    }

    updateActiveProfileData((currentProfileData) => {
      const currentShifts = currentProfileData.shifts || [];
      const nextShifts = editingShift
        ? currentShifts.map((shift) =>
            shift.id === editingShift.id ? { ...shiftInput, id: editingShift.id } : shift
          )
        : [{ ...shiftInput, id: crypto.randomUUID() }, ...currentShifts];

      return {
        ...currentProfileData,
        shifts: nextShifts,
      };
    });

    closeShiftDialog();
    return true;
  }

  async function handleSaveBatchShifts(shiftInputs) {
    if (!shiftInputs.length) {
      return false;
    }

    if (isCloudMode) {
      try {
        setCloudError('');

        const payload = shiftInputs.map((shiftInput) =>
          serializeShift(
            {
              ...shiftInput,
              id: crypto.randomUUID(),
            },
            session.user.id
          )
        );

        const { data, error } = await supabase.from('shifts').insert(payload).select();

        if (error) {
          throw error;
        }

        setCloudProfileData((currentData) => ({
          ...currentData,
          shifts: sortShiftsNewestFirst([
            ...(data || []).map((shiftRow) => normalizeShiftRow(shiftRow, jobs)),
            ...currentData.shifts,
          ]),
        }));

        closeShiftDialog();
        return true;
      } catch (error) {
        setCloudError(error.message || 'Unable to save the scanned shifts.');
        return false;
      }

      return false;
    }

    updateActiveProfileData((currentProfileData) => ({
      ...currentProfileData,
      shifts: [
        ...shiftInputs.map((shiftInput) => ({
          ...shiftInput,
          id: crypto.randomUUID(),
        })),
        ...(currentProfileData.shifts || []),
      ],
    }));

    closeShiftDialog();
    return true;
  }

  function handleEditShift(shift) {
    setEditingShift(shift);
    setIsAddOpen(true);
  }

  function queueDeletedShiftForUndo(shift) {
    if (deleteUndoTimeoutRef.current) {
      clearTimeout(deleteUndoTimeoutRef.current);
    }

    setLastDeletedShift(shift);
    deleteUndoTimeoutRef.current = setTimeout(() => {
      setLastDeletedShift(null);
      deleteUndoTimeoutRef.current = null;
    }, 8000);
  }

  async function handleDeleteShift(id) {
    const deletedShift = shifts.find((shift) => shift.id === id);
    if (!deletedShift) {
      return;
    }

    if (isCloudMode) {
      try {
        setCloudError('');

        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id);

        if (error) {
          throw error;
        }

        setCloudProfileData((currentData) => ({
          ...currentData,
          shifts: currentData.shifts.filter((shift) => shift.id !== id),
        }));
        queueDeletedShiftForUndo(deletedShift);
      } catch (error) {
        setCloudError(error.message || 'Unable to delete this shift.');
      }

      return;
    }

    updateActiveProfileData((currentProfileData) => ({
      ...currentProfileData,
      shifts: (currentProfileData.shifts || []).filter((shift) => shift.id !== id),
    }));
    queueDeletedShiftForUndo(deletedShift);
  }

  async function handleUndoDeleteShift() {
    if (!lastDeletedShift) {
      return;
    }

    if (deleteUndoTimeoutRef.current) {
      clearTimeout(deleteUndoTimeoutRef.current);
      deleteUndoTimeoutRef.current = null;
    }

    if (isCloudMode) {
      try {
        setCloudError('');

        const { data, error } = await supabase
          .from('shifts')
          .insert(serializeShift(lastDeletedShift, session.user.id))
          .select()
          .single();

        if (error) {
          throw error;
        }

        const restoredShift = normalizeShiftRow(data, jobs);

        setCloudProfileData((currentData) => ({
          ...currentData,
          shifts: sortShiftsNewestFirst([restoredShift, ...currentData.shifts]),
        }));
        setLastDeletedShift(null);
      } catch (error) {
        setCloudError(error.message || 'Unable to restore this deleted shift.');
      }

      return;
    }

    updateActiveProfileData((currentProfileData) => ({
      ...currentProfileData,
      shifts: sortShiftsNewestFirst([
        lastDeletedShift,
        ...(currentProfileData.shifts || []).filter((shift) => shift.id !== lastDeletedShift.id),
      ]),
    }));
    setLastDeletedShift(null);
  }

  async function handleSaveSettings(nextSettings) {
    const normalizedNextSettings = normalizeSettings(nextSettings);

    if (isCloudMode) {
      try {
        setCloudError('');

        const { data, error } = await supabase
          .from('settings')
          .upsert(serializeSettings(normalizedNextSettings, session.user.id, cloudProfileName))
          .select()
          .single();

        if (error) {
          throw error;
        }

        const normalized = normalizeSettingsRow(data, session.user);

        setCloudProfileName(normalized.profileName);
        setCloudProfileData((currentData) => ({
          ...currentData,
          settings: normalized.settings,
        }));
        return;
      } catch (error) {
        setCloudError(error.message || 'Unable to save your synced settings.');
        return;
      }
    }

    updateActiveProfileData((currentProfileData) => ({
      ...currentProfileData,
      settings: normalizedNextSettings,
    }));
  }

  function handleCreateProfile() {
    const profileNameInput = window.prompt('New profile name');
    const trimmedName = profileNameInput?.trim();

    if (!trimmedName) {
      return;
    }

    const profileId = `${slugifyProfileName(trimmedName) || 'profile'}-${Date.now()}`;

    setProfileStore((currentStore) => ({
      profiles: [...currentStore.profiles, { id: profileId, name: trimmedName }],
      dataById: {
        ...currentStore.dataById,
        [profileId]: createEmptyProfileData(),
      },
    }));

    setActiveProfileId(profileId);
    setSelectedDate('');
    setEditingShift(null);
    setIsAddOpen(false);
    setIsSettingsOpen(false);
  }

  function handleExportCsv() {
    const rows = [
      [
        'Date',
        'Job',
        'Start Time',
        'End Time',
        'Hours',
        'Sales',
        'Gross Tips',
        'Tip Out',
        'Net Tips',
        'Base Pay',
        'Total Take Home',
        'Floor',
        'Notes',
      ],
      ...sortedShifts.map((shift) => {
        const tips = Number(shift.tips) || 0;
        const sales = getSales(shift);
        const tipOut = getTipOut(shift, settings);
        const netTips = getNetTips(shift, settings);
        const basePay = getBasePay(shift, settings.hourlyRate);

        return [
          shift.date,
          getJobName(shift.jobId, jobs),
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
    link.download = `${slugifyProfileName(profileName || 'profile') || 'profile'}-earnings-tracker-shifts.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleCalendarDateClick(dateString) {
    setSelectedDate(dateString);
    setHistoryFilterType('all');
    setHistoryFilterValue('');
    setView('byDay');
  }

  function handleHistoryFilterTypeChange(nextType) {
    setSelectedDate('');
    setHistoryFilterType(nextType);
    setHistoryFilterValue(nextType === 'days' ? '14' : '');
  }

  function handleHistoryFilterValueChange(nextValue) {
    setSelectedDate('');
    setHistoryFilterValue(nextValue);
  }

  function clearHistoryFilters() {
    setSelectedDate('');
    setHistoryFilterType('all');
    setHistoryFilterValue('');
  }

  function handlePayPeriodSelect(period) {
    setSelectedDate('');
    setHistoryFilterType('payPeriod');
    setHistoryFilterValue(period.key);
    setView('byDay');
  }

  function handleChangeProfile(nextProfileId) {
    setActiveProfileId(nextProfileId);
    clearHistoryFilters();
    setEditingShift(null);
    setIsAddOpen(false);
    setIsSettingsOpen(false);
    setView('dashboard');
  }

  async function handleSignIn({ email, password }) {
    try {
      setIsAuthSubmitting(true);
      setAuthError('');
      setAuthMessage('');

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setAuthError(error.message || 'Unable to sign in.');
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleSignUp({ displayName, email, password }) {
    try {
      setIsAuthSubmitting(true);
      setAuthError('');
      setAuthMessage('');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        setAuthMessage('Check your email to confirm your account, then sign in.');
        return;
      }

      setAuthMessage('Your account is ready and your data will sync on every device you use.');
    } catch (error) {
      setAuthError(error.message || 'Unable to create your account.');
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    try {
      setCloudError('');
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      setCloudError(error.message || 'Unable to sign out right now.');
    }
  }

  async function handleImportLocalData() {
    if (!session?.user) {
      return;
    }

    try {
      setIsImportingLocalData(true);
      setCloudError('');

      const settingsPayload = serializeSettings(
        localDataset.settings,
        session.user.id,
        localDataset.profileName
      );

      const shiftPayload = localDataset.shifts.map((shift) =>
        serializeShift(
          {
            ...shift,
            id: shift.id || crypto.randomUUID(),
          },
          session.user.id
        )
      );

      const operations = [
        supabase.from('settings').upsert(settingsPayload).select().single(),
      ];

      if (shiftPayload.length) {
        operations.push(
          supabase.from('shifts').upsert(shiftPayload, { onConflict: 'id' }).select()
        );
      }

      const results = await Promise.all(operations);
      const settingsResult = results[0];

      if (settingsResult.error) {
        throw settingsResult.error;
      }

      const shiftsResult = results[1];
      if (shiftsResult?.error) {
        throw shiftsResult.error;
      }

      const normalized = normalizeSettingsRow(settingsResult.data, session.user);
      const importedShifts = shiftsResult?.data?.length
        ? shiftsResult.data.map((shiftRow) =>
            normalizeShiftRow(shiftRow, normalized.settings.jobs)
          )
        : localDataset.shifts;

      setCloudProfileName(normalized.profileName);
      setCloudProfileData({
        settings: normalized.settings,
        shifts: sortShiftsNewestFirst(importedShifts),
      });
    } catch (error) {
      setCloudError(error.message || 'Unable to import your local device data.');
    } finally {
      setIsImportingLocalData(false);
    }
  }

  const navItems = [
    ['about', 'About'],
    ['dashboard', 'Dashboard'],
    ['byDay', 'By Day'],
    ['biWeekly', 'Bi-Weekly'],
    ['floor', 'Floor'],
    ['calendar', 'Calendar'],
  ];

  let content;

  if (!isAuthReady) {
    content = (
      <Flex minH="100vh" align="center" justify="center" direction="column" gap={4}>
        <Spinner size="xl" color="teal.300" thickness="4px" />
        <Text color="gray.400">Checking your account session...</Text>
      </Flex>
    );
  } else if (isSupabaseConfigured && !session?.user) {
    content = (
      <AuthScreen
        isDarkMode={isDarkMode}
        isSubmitting={isAuthSubmitting}
        authError={authError}
        authMessage={authMessage}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    );
  } else {
    content = (
      <Box minH="100vh" bg="transparent">
        <Box
          as="header"
          position="sticky"
          top={0}
          zIndex={20}
          bg={isDarkMode ? 'rgba(11, 18, 32, 0.72)' : 'rgba(246, 248, 252, 0.72)'}
          backdropFilter="blur(20px) saturate(180%)"
          borderBottom="1px solid"
          borderColor={themeTokens.border}
          px={{ base: 4, md: 6 }}
          py={3}
        >
          <Flex
            maxW="1280px"
            mx="auto"
            align="center"
            justify="space-between"
            gap={3}
            rowGap={3}
            wrap={{ base: 'wrap', md: 'nowrap' }}
          >
            {/* Brand: a compact mark plus a single line of identity. The old
                header stacked a wordmark, an H1, and a marketing tagline — that
                copy lives in the About tab, not in the chrome of a signed-in app. */}
            <HStack spacing={3} minW={0}>
              <Flex
                boxSize="34px"
                flexShrink={0}
                align="center"
                justify="center"
                borderRadius={RADII.md}
                bg={ACCENTS.primary}
                color="white"
                fontWeight={700}
                fontSize="13px"
                letterSpacing="-0.02em"
                boxShadow={`0 4px 14px ${ACCENTS.primaryMuted}`}
              >
                TC
              </Flex>
              <Box minW={0}>
                <Text
                  fontSize="15px"
                  fontWeight={650}
                  letterSpacing="-0.015em"
                  color={themeTokens.text}
                  lineHeight="1.2"
                  noOfLines={1}
                >
                  Earnings Tracker
                </Text>
                <HStack spacing={1.5} mt="1px">
                  <Text fontSize="11px" color={themeTokens.textSubtle} noOfLines={1}>
                    {selectedJob ? selectedJob.name : 'All jobs'}
                  </Text>
                  <Box boxSize="3px" borderRadius="full" bg={themeTokens.textSubtle} opacity={0.6} />
                  <Text fontSize="11px" color={themeTokens.textSubtle} noOfLines={1}>
                    {isCloudMode ? 'Synced' : 'Local device'}
                  </Text>
                </HStack>
              </Box>
            </HStack>

            <HStack
              spacing={2}
              flexWrap="wrap"
              rowGap={2}
              justify="flex-end"
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
            >
              {!isCloudMode ? (
                <>
                  <Select
                    value={activeProfileId}
                    onChange={(event) => handleChangeProfile(event.target.value)}
                    size="sm"
                    maxW="160px"
                    display={{ base: 'none', lg: 'block' }}
                  >
                    {(profileStore.profiles || []).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    color={themeTokens.textMuted}
                    display={{ base: 'none', lg: 'inline-flex' }}
                    onClick={handleCreateProfile}
                  >
                    New profile
                  </Button>
                </>
              ) : null}

              <Select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                size="sm"
                maxW={{ base: '130px', md: '170px' }}
                aria-label="Filter by job"
              >
                <option value={ALL_JOBS_VALUE}>All jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))}
              </Select>

              <IconButton
                icon={isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                variant="ghost"
                size="sm"
                color={themeTokens.textMuted}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setUiMode((current) => (current === 'dark' ? 'light' : 'dark'))}
              />
              <IconButton
                icon={<Settings size={15} />}
                variant="ghost"
                size="sm"
                color={themeTokens.textMuted}
                aria-label="Open settings"
                onClick={() => setIsSettingsOpen(true)}
              />
              <IconButton
                icon={<Download size={15} />}
                variant="ghost"
                size="sm"
                color={themeTokens.textMuted}
                aria-label="Export CSV"
                onClick={handleExportCsv}
              />

              <Button
                leftIcon={<Plus size={15} />}
                size="sm"
                bg={ACCENTS.primary}
                color="white"
                _hover={{ bg: '#2f6fd0' }}
                onClick={openNewShiftDialog}
              >
                Add shift
              </Button>

              {/* The signed-in address used to sit in the bar as a full-width
                  all-caps pill. It moves into an avatar menu, where an email
                  belongs. */}
              {isCloudMode ? (
                <Menu placement="bottom-end">
                  <MenuButton
                    as={IconButton}
                    variant="ghost"
                    size="sm"
                    aria-label="Account menu"
                    icon={
                      <Flex
                        boxSize="26px"
                        align="center"
                        justify="center"
                        borderRadius="full"
                        bg={themeTokens.surfaceSunken}
                        border="1px solid"
                        borderColor={themeTokens.borderStrong}
                        color={themeTokens.text}
                        fontSize="11px"
                        fontWeight={650}
                      >
                        {(session.user.email || '?').slice(0, 2).toUpperCase()}
                      </Flex>
                    }
                  />
                  <MenuList
                    bg={themeTokens.surfaceRaised}
                    borderColor={themeTokens.border}
                    borderRadius={RADII.md}
                    boxShadow={themeTokens.shadowRaised}
                    py={1}
                    minW="230px"
                  >
                    <Box px={3} py={2}>
                      <Text fontSize="11px" color={themeTokens.textSubtle}>
                        Signed in as
                      </Text>
                      <Text fontSize="13px" color={themeTokens.text} fontWeight={500} noOfLines={1}>
                        {session.user.email}
                      </Text>
                    </Box>
                    <Box height="1px" bg={themeTokens.border} my={1} />
                    <MenuItem
                      icon={<LogOut size={14} />}
                      bg="transparent"
                      color={themeTokens.textMuted}
                      fontSize="13px"
                      _hover={{ bg: themeTokens.surfaceSunken, color: themeTokens.text }}
                      onClick={handleSignOut}
                    >
                      Sign out
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : null}
            </HStack>
          </Flex>
        </Box>

        <Box
          bg="transparent"
          px={{ base: 4, md: 6 }}
          py={4}
        >
          <Flex
            maxW="1280px"
            mx="auto"
            gap={2}
            wrap="wrap"
            p="6px"
            bg={isDarkMode ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255,255,255,0.78)'}
            border={`1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(22, 33, 43, 0.06)'}`}
            borderRadius="full"
            width="fit-content"
            boxShadow="0 10px 24px rgba(34, 46, 56, 0.06)"
          >
            {navItems.map(([mode, label]) => {
              const isActive = view === mode;
              return (
                <Button
                  key={mode}
                  size="sm"
                  borderRadius="full"
                  bg={isActive ? 'brand.600' : 'transparent'}
                  color={isActive ? 'white' : isDarkMode ? 'gray.200' : 'gray.800'}
                  _hover={{
                    bg: isActive ? 'brand.700' : 'blackAlpha.50',
                    color: isActive ? 'white' : isDarkMode ? 'white' : 'gray.900',
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
            {!isSupabaseConfigured ? (
              <Alert
                status="info"
                mb={4}
                borderRadius={RADII.lg}
                bg={themeTokens.surface}
                color={themeTokens.textMuted}
                fontSize="sm"
                border="1px solid"
                borderColor={themeTokens.border}
              >
                <AlertIcon />
                <AlertDescription>
                  Password login and cross-device sync are now wired in the code. Add your
                  Supabase URL and anon key in Vercel to turn cloud accounts on.
                </AlertDescription>
              </Alert>
            ) : null}

            {isCloudLoading ? (
              <Flex
                mb={4}
                p={5}
                bg="rgba(255, 255, 255, 0.9)"
                borderRadius="3xl"
                border="1px solid"
                borderColor="rgba(22, 33, 43, 0.06)"
                align="center"
                gap={3}
              >
                <Spinner size="sm" color="teal.300" />
                <Text color="gray.300">Loading your synced shifts...</Text>
              </Flex>
            ) : null}

            {cloudError ? (
              <Alert
                status="error"
                mb={4}
                borderRadius={RADII.lg}
                fontSize="sm"
                bg={isDarkMode ? 'rgba(136, 19, 55, 0.35)' : 'rgba(254, 226, 226, 0.9)'}
                color={isDarkMode ? '#fecdd3' : '#9f1239'}
                border="1px solid"
                borderColor={isDarkMode ? 'rgba(251, 113, 133, 0.25)' : 'rgba(159, 18, 57, 0.15)'}
              >
                <AlertIcon />
                <AlertDescription>{cloudError}</AlertDescription>
              </Alert>
            ) : null}

            {lastDeletedShift ? (
              <Alert
                status="warning"
                mb={4}
                borderRadius="3xl"
                bg={isDarkMode ? 'rgba(133, 77, 14, 0.22)' : 'rgba(245, 158, 11, 0.12)'}
                border="1px solid rgba(245, 158, 11, 0.22)"
              >
                <AlertIcon />
                <Flex
                  w="full"
                  align={{ base: 'flex-start', md: 'center' }}
                  justify="space-between"
                  direction={{ base: 'column', md: 'row' }}
                  gap={3}
                >
                  <AlertDescription>
                    Deleted shift from {lastDeletedShift.date}. Undo if that was accidental.
                  </AlertDescription>
                  <Button size="sm" bg="brand.600" color="white" _hover={{ bg: 'brand.700' }} onClick={handleUndoDeleteShift}>
                    Undo Delete
                  </Button>
                </Flex>
              </Alert>
            ) : null}

            {canImportLocalData ? (
              <Box
                mb={4}
                p={5}
                bg="rgba(255, 255, 255, 0.9)"
                borderRadius="3xl"
                border="1px solid"
                borderColor="rgba(22, 33, 43, 0.06)"
              >
                <Flex
                  align={{ base: 'flex-start', md: 'center' }}
                  justify="space-between"
                  direction={{ base: 'column', md: 'row' }}
                  gap={4}
                >
                  <Box>
                    <Text fontWeight="semibold">Bring over the data from this device</Text>
                    <Text mt={1} color="gray.400" fontSize="sm">
                      I found local shifts and settings for {localDataset.profileName}. Import them
                      once so this account starts with your existing history.
                    </Text>
                  </Box>
                  <Button
                    bg="brand.600"
                    color="white"
                    _hover={{ bg: 'brand.700' }}
                    onClick={handleImportLocalData}
                    isLoading={isImportingLocalData}
                  >
                    Import My Local Data
                  </Button>
                </Flex>
              </Box>
            ) : null}

            <Box display="grid" gap={4} mb={5}>
              <Box>
                {topSummary.shifts === 0 ? (
                  <EmptyPeriodCard
                    isDarkMode={isDarkMode}
                    periodLabel={topSummary.title}
                    lastPeriod={lastLoggedPeriod}
                    onAddShift={openNewShiftDialog}
                  />
                ) : (
                <SnapshotCard
                  isDarkMode={isDarkMode}
                  label={topSummary.modeLabel}
                  title={topSummary.title}
                  value={formatCurrency(topSummary.takeHome)}
                  detail={`${topSummary.shifts} ${
                    topSummary.shifts === 1 ? 'shift' : 'shifts'
                  } in this snapshot • ${formatSignedCurrency(
                    payPeriodComparison.takeHomeDelta
                  )} vs last period`}
                  helper={topSummary.helper}
                  accent={ACCENTS.primary}
                  metrics={[
                    {
                      label: 'Hours worked',
                      value: topSummary.hours.toFixed(1),
                      helper: 'Total hours in this pay period',
                    },
                    {
                      label: 'Effective hourly',
                      value: formatCurrency(dashboardInsights.effectiveHourly),
                      helper: 'Take-home divided by hours worked',
                    },
                    {
                      label: 'Sales',
                      value: formatCurrency(topSummary.sales),
                      helper: `${formatSignedCurrency(payPeriodComparison.salesDelta)} vs last period`,
                    },
                    {
                      label: 'Avg per shift',
                      value: formatCurrency(
                        topSummary.shifts > 0 ? topSummary.takeHome / topSummary.shifts : 0
                      ),
                      helper: 'Average take-home from the shifts in view',
                    },
                  ]}
                />
                )}
              </Box>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4} alignItems="start">
                {topSummary.shifts > 0 ? (
                <>
                <SummaryCard
                  icon={TrendingUp}
                  isDarkMode={isDarkMode}
                  label={payPeriodComparison.label}
                  value={formatSignedCurrency(payPeriodComparison.takeHomeDelta)}
                  helper={`${formatSignedPercent(
                    payPeriodComparison.takeHomeDeltaPercent
                  )} take-home change from ${formatCurrency(
                    payPeriodComparison.previousTakeHome
                  )}.`}
                  accent={ACCENTS.positive}
                />
                <SummaryCard
                  icon={Target}
                  isDarkMode={isDarkMode}
                  label="Projected finish"
                  value={formatCurrency(payPeriodForecast.projectedTakeHome)}
                  helper={`Through day ${payPeriodForecast.elapsedDays} of ${
                    payPeriodForecast.totalDays
                  }, pacing toward ${formatCurrency(
                    payPeriodForecast.projectedNetTips
                  )} in net tips.`}
                  accent={ACCENTS.warning}
                />
                </>
                ) : null}
                <SummaryCard
                  icon={Wallet}
                  isDarkMode={isDarkMode}
                  label="Yearly wages"
                  value={formatCurrency(yearlyStats.totalTakeHome)}
                  helper={`${yearlyStats.year} running total ${
                    selectedJob ? `for ${selectedJob.name}.` : 'across all saved shifts.'
                  }`}
                  accent={ACCENTS.neutral}
                />
                <InsightCard
                  isDarkMode={isDarkMode}
                  label="Insight"
                  title={
                    dashboardInsights.bestShift
                      ? `Best shift: ${formatCurrency(dashboardInsights.bestShift.takeHome)}`
                      : 'Best shift insight appears once shifts are logged'
                  }
                  helper={
                    dashboardInsights.bestShift
                      ? `${formatDateLabel(
                          dashboardInsights.bestShift.date
                        )} delivered ${formatCurrency(
                          dashboardInsights.bestShift.sales
                        )} in sales. Net tips are running at ${formatMultiplier(
                          dashboardInsights.netTipRate
                        )} tip-out this period.`
                      : 'Add a few more shifts and the dashboard will start surfacing smarter patterns.'
                  }
                  accent={ACCENTS.primary}
                />
              </SimpleGrid>
            </Box>

            {view === 'byDay' ? (
              <Flex
                mb={4}
                p={4}
                bg="rgba(255, 255, 255, 0.9)"
                borderRadius="3xl"
                border="1px solid"
                borderColor="rgba(22, 33, 43, 0.06)"
                align={{ base: 'flex-start', md: 'center' }}
                justify="space-between"
                direction={{ base: 'column', md: 'row' }}
                gap={3}
              >
                <Box>
                  <Text fontWeight="semibold">
                    {activeHistoryLabel || 'Browse your saved shifts'}
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Filter by day, month, week, or pay period to find and fix older entries faster.
                  </Text>
                </Box>
                <HStack spacing={2} flexWrap="wrap">
                  <Select
                    value={historyFilterType}
                    onChange={(event) => handleHistoryFilterTypeChange(event.target.value)}
                    maxW={{ base: 'full', md: '180px' }}
                  >
                    <option value="all">All shifts</option>
                    <option value="days">By days</option>
                    <option value="month">By month</option>
                    <option value="week">By week</option>
                    <option value="payPeriod">By pay period</option>
                  </Select>
                  {historyFilterType === 'days' ? (
                    <>
                      <Select
                        value={historyFilterValue}
                        onChange={(event) => handleHistoryFilterValueChange(event.target.value)}
                        maxW={{ base: 'full', md: '180px' }}
                      >
                        <option value="7">Last 7 days</option>
                        <option value="14">Last 14 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="60">Last 60 days</option>
                        <option value="custom">Custom days</option>
                      </Select>
                      {historyFilterValue === 'custom' ? (
                        <Input
                          type="number"
                          min={1}
                          value={historyCustomDays}
                          onChange={(event) => setHistoryCustomDays(event.target.value)}
                          maxW={{ base: 'full', md: '150px' }}
                          placeholder="Days"
                        />
                      ) : null}
                    </>
                  ) : null}
                  {historyFilterType === 'month' ? (
                    <Select
                      placeholder="Choose month"
                      value={historyFilterValue}
                      onChange={(event) => handleHistoryFilterValueChange(event.target.value)}
                      maxW={{ base: 'full', md: '220px' }}
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                  {historyFilterType === 'week' ? (
                    <Select
                      placeholder="Choose week"
                      value={historyFilterValue}
                      onChange={(event) => handleHistoryFilterValueChange(event.target.value)}
                      maxW={{ base: 'full', md: '220px' }}
                    >
                      {weekOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                  {historyFilterType === 'payPeriod' ? (
                    <Select
                      placeholder="Choose pay period"
                      value={historyFilterValue}
                      onChange={(event) => handleHistoryFilterValueChange(event.target.value)}
                      maxW={{ base: 'full', md: '240px' }}
                    >
                      {payPeriodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                  <Button variant="outline" onClick={clearHistoryFilters}>
                    Clear
                  </Button>
                </HStack>
              </Flex>
            ) : null}

            {view === 'about' ? <AboutView isDarkMode={isDarkMode} /> : null}

            {view === 'dashboard' ? (
              <Box display="grid" gap={6}>
                <BiWeeklyHours
                  isDarkMode={isDarkMode}
                  shifts={filteredByJobShifts}
                  settings={settings}
                  onSelectPeriod={handlePayPeriodSelect}
                />
                <ShiftsByDay
                  isDarkMode={isDarkMode}
                  shifts={sortedShifts.slice(0, 8)}
                  settings={settings}
                  jobs={jobs}
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
                isDarkMode={isDarkMode}
                shifts={filteredShifts}
                settings={settings}
                jobs={jobs}
                onEdit={handleEditShift}
                onDelete={handleDeleteShift}
                title={activeHistoryLabel || 'All shifts'}
                badgeLabel={`${filteredShifts.length} ${filteredShifts.length === 1 ? 'shift' : 'shifts'}`}
                emptyTitle={selectedDate || historyFilterValue ? 'No shifts in this filter.' : 'No shifts logged yet.'}
                emptySubtitle={
                  selectedDate || historyFilterValue
                    ? 'Try another filter or clear it to see your full shift history.'
                    : 'Add a shift to start building your history.'
                }
              />
            ) : null}

            {view === 'biWeekly' ? (
              <BiWeeklyHours
                isDarkMode={isDarkMode}
                shifts={filteredByJobShifts}
                settings={settings}
                onSelectPeriod={handlePayPeriodSelect}
              />
            ) : null}
            {view === 'floor' ? (
              <FloorComparison shifts={filteredByJobShifts} settings={settings} />
            ) : null}
            {view === 'calendar' ? (
              <CalendarView
                shifts={filteredByJobShifts}
                selectedDate={selectedDate}
                onDateClick={handleCalendarDateClick}
              />
            ) : null}
          </Box>
        </Box>

        <AddShiftDialog
          isDarkMode={isDarkMode}
          isOpen={isAddOpen}
          onClose={closeShiftDialog}
          onSave={handleSaveShift}
          onSaveBatch={handleSaveBatchShifts}
          editingShift={editingShift}
          settings={settings}
          jobs={jobs}
          defaultJobId={selectedJob?.id || getDefaultJobId(jobs)}
          existingShifts={shifts}
        />

        <SettingsDialog
          isDarkMode={isDarkMode}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          settings={settings}
        />
      </Box>
    );
  }

  return <ChakraProvider theme={theme}>{content}</ChakraProvider>;
}

export default App;
