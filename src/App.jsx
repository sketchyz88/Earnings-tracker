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
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import AboutView from './components/AboutView';
import AuthScreen from './components/AuthScreen';
import BiWeeklyHours, { buildPeriodSummary, getPeriodStart, getPeriods } from './components/BiWeeklyHours';
import CalendarView from './components/CalendarView';
import FloorComparison from './components/FloorComparison';
import SettingsDialog from './components/SettingsDialog';
import ShiftsByDay from './components/ShiftsByDay';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const STORAGE_KEYS = {
  profiles: 'earnings_tracker_profiles_v1',
  activeProfileId: 'earnings_tracker_active_profile_id',
  legacyShifts: 'earnings_tracker_shifts',
  legacySettings: 'earnings_tracker_settings',
  uiMode: 'earnings_tracker_ui_mode',
};

const DEFAULT_SETTINGS = {
  hourlyRate: 15,
  tipOutRate: 4.5,
  tipGoal: 100,
  hoursGoal: 80,
};

const DEFAULT_PROFILE = {
  id: 'default-profile',
  name: 'My Profile',
};

function createTheme(uiMode) {
  const isDarkMode = uiMode === 'dark';

  return extendTheme({
  config: {
    initialColorMode: isDarkMode ? 'dark' : 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'Avenir Next', 'Segoe UI', sans-serif`,
    body: `'Avenir Next', 'Segoe UI', sans-serif`,
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
        bg: isDarkMode ? '#0f172a' : '#f5f7fb',
        color: isDarkMode ? '#e5e7eb' : '#111827',
        backgroundImage:
          isDarkMode
            ? 'radial-gradient(circle at top, rgba(59,130,246,0.16), transparent 24%), linear-gradient(180deg, #111827 0%, #0f172a 55%, #020617 100%)'
            : 'radial-gradient(circle at top, rgba(59,130,246,0.1), transparent 24%), linear-gradient(180deg, #fafcff 0%, #f5f7fb 55%, #eef2f7 100%)',
      },
      '*::placeholder': {
        color: '#8b8f92',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: 'semibold',
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
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
    Select: {
      variants: {
        outline: {
          field: {
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
          icon: {
            color: isDarkMode ? '#94a3b8' : '#6f7780',
          },
        },
      },
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
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
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function createEmptyProfileData() {
  return {
    shifts: [],
    settings: DEFAULT_SETTINGS,
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

  return {
    profileName: activeProfile.name || DEFAULT_PROFILE.name,
    shifts: sortShiftsNewestFirst(activeProfileData.shifts || []),
    settings: { ...DEFAULT_SETTINGS, ...(activeProfileData.settings || {}) },
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
    settings: {
      hourlyRate: Number(settingsRow?.hourly_rate) || DEFAULT_SETTINGS.hourlyRate,
      tipOutRate: Number(settingsRow?.tip_out_rate) || DEFAULT_SETTINGS.tipOutRate,
      tipGoal: Number(settingsRow?.tip_goal) || DEFAULT_SETTINGS.tipGoal,
      hoursGoal: Number(settingsRow?.hours_goal) || DEFAULT_SETTINGS.hoursGoal,
    },
  };
}

function normalizeShiftRow(shiftRow) {
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
  };
}

function serializeSettings(settings, userId, profileName) {
  return {
    user_id: userId,
    display_name: profileName,
    hourly_rate: Number(settings.hourlyRate) || DEFAULT_SETTINGS.hourlyRate,
    tip_out_rate: Number(settings.tipOutRate) || DEFAULT_SETTINGS.tipOutRate,
    tip_goal: Number(settings.tipGoal) || DEFAULT_SETTINGS.tipGoal,
    hours_goal: Number(settings.hoursGoal) || DEFAULT_SETTINGS.hoursGoal,
  };
}

function hasLocalDataToImport(dataset) {
  const hasShifts = Boolean(dataset.shifts.length);
  const hasCustomSettings = Object.entries(DEFAULT_SETTINGS).some(([key, defaultValue]) => {
    return Number(dataset.settings[key]) !== Number(defaultValue);
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
  return (
    <Box
      bg={
        isDarkMode
          ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)'
      }
      borderRadius="32px"
      p={{ base: 6, md: 7 }}
      border="1px solid"
      borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.08)'}
      boxShadow={isDarkMode ? '0 26px 54px rgba(2, 6, 23, 0.42)' : '0 24px 48px rgba(15, 23, 42, 0.08)'}
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        insetX={0}
        top={0}
        height="5px"
        bg={accent}
        opacity={0.9}
      />
      <Text
        color={isDarkMode ? 'gray.400' : 'gray.600'}
        fontSize="xs"
        fontWeight="semibold"
        letterSpacing="0.14em"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text
        mt={3}
        color={isDarkMode ? 'white' : 'gray.900'}
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight="bold"
        lineHeight="shorter"
        maxW="18ch"
      >
        {title}
      </Text>
      <Text
        mt={4}
        color={isDarkMode ? 'white' : 'gray.900'}
        fontSize={{ base: '3xl', md: '4xl' }}
        fontWeight="black"
        lineHeight="0.95"
      >
        {value}
      </Text>
      {detail ? (
        <Text mt={2} color={accent} fontSize="sm" fontWeight="semibold">
          {detail}
        </Text>
      ) : null}

      {metrics.length ? (
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={3} mt={6}>
          {metrics.map((metric) => (
            <Box
              key={metric.label}
              bg={isDarkMode ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.82)'}
              borderRadius="22px"
              p={4}
              border="1px solid"
              borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)'}
            >
              <Text
                color={isDarkMode ? 'gray.400' : 'gray.500'}
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
                letterSpacing="0.1em"
              >
                {metric.label}
              </Text>
              <Text
                mt={1.5}
                color={isDarkMode ? 'white' : 'gray.900'}
                fontSize="xl"
                fontWeight="bold"
              >
                {metric.value}
              </Text>
              <Text mt={1} color={isDarkMode ? 'gray.400' : 'gray.600'} fontSize="sm">
                {metric.helper}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}

      <Box
        mt={6}
        pt={4}
        borderTop="1px solid"
        borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)'}
      >
        <Text color={isDarkMode ? 'gray.300' : 'gray.700'} fontSize="sm" lineHeight="tall">
          {helper}
        </Text>
      </Box>
    </Box>
  );
}

function SummaryCard({ icon: Icon, isDarkMode, label, value, helper, accent }) {
  return (
    <Box
      bg={isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'}
      borderRadius="28px"
      p={{ base: 5, md: 5.5 }}
      border="1px solid"
      borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)'}
      boxShadow={isDarkMode ? '0 20px 44px rgba(2, 6, 23, 0.34)' : '0 18px 36px rgba(15, 23, 42, 0.08)'}
    >
      <Flex justify="space-between" align="flex-start" gap={4}>
        <Box>
          <Text
            color={isDarkMode ? 'gray.400' : 'gray.600'}
            fontSize="xs"
            fontWeight="semibold"
            letterSpacing="0.14em"
            textTransform="uppercase"
          >
            {label}
          </Text>
          <Text
            mt={3}
            color={isDarkMode ? 'white' : 'gray.900'}
            fontSize={{ base: '2xl', md: '2.5xl' }}
            fontWeight="bold"
            lineHeight="shorter"
          >
            {value}
          </Text>
          <Text mt={2} color={isDarkMode ? 'gray.300' : 'gray.600'} fontSize="sm" lineHeight="tall">
            {helper}
          </Text>
        </Box>

        <Flex
          color={accent}
          bg={`${accent}14`}
          border="1px solid"
          borderColor={`${accent}22`}
          borderRadius="2xl"
          p={3.5}
          align="center"
          justify="center"
          flexShrink={0}
        >
          <Icon size={24} />
        </Flex>
      </Flex>
    </Box>
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

  return {
    profileName: normalizedSettings.profileName,
    shifts: (shiftRows || []).map(normalizeShiftRow),
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
  const [selectedDate, setSelectedDate] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('all');
  const [historyFilterValue, setHistoryFilterValue] = useState('');
  const [editingShift, setEditingShift] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastDeletedShift, setLastDeletedShift] = useState(null);
  const isDarkMode = uiMode === 'dark';
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
  const settings = isCloudMode
    ? { ...DEFAULT_SETTINGS, ...(cloudProfileData.settings || {}) }
    : localDataset.settings;

  const canImportLocalData =
    isCloudMode && !cloudProfileData.shifts.length && hasLocalDataToImport(localDataset);

  const payPeriodStats = useMemo(() => {
    const hourlyRate = settings?.hourlyRate || 0;
    const tipOutRate = settings?.tipOutRate || 0;
    const periods = getPeriods(shifts, hourlyRate, tipOutRate);
    const todayPeriodStart = getPeriodStart(new Date());
    const todayPeriodKey = todayPeriodStart.toISOString();
    const selectedPeriod =
      historyFilterType === 'payPeriod' && historyFilterValue
        ? periods.find((period) => period.key === historyFilterValue)
        : null;
    const activePeriod =
      selectedPeriod ||
      periods.find((period) => period.key === todayPeriodKey) ||
      buildPeriodSummary(todayPeriodStart, [], hourlyRate, tipOutRate);

    return activePeriod;
  }, [
    historyFilterType,
    historyFilterValue,
    settings?.hourlyRate,
    settings?.tipOutRate,
    shifts,
  ]);
  const yearlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearShifts = shifts.filter((shift) => {
      if (!shift.date) {
        return false;
      }

      return new Date(`${shift.date}T00:00:00`).getFullYear() === currentYear;
    });

    return {
      year: currentYear,
      ...computeStats(yearShifts, settings),
    };
  }, [settings, shifts]);

  const monthOptions = useMemo(() => {
    const seen = new Map();
    shifts.forEach((shift) => {
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
  }, [shifts]);

  const weekOptions = useMemo(() => {
    const seen = new Map();
    shifts.forEach((shift) => {
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
  }, [shifts]);

  const payPeriodOptions = useMemo(
    () =>
      getPeriods(shifts || [], settings?.hourlyRate || 0, settings?.tipOutRate || 0)
        .slice()
        .reverse()
        .map((period) => ({ value: period.key, label: period.label })),
    [settings?.hourlyRate, settings?.tipOutRate, shifts]
  );

  const filteredShifts = useMemo(() => {
    if (!selectedDate) {
      if (historyFilterType === 'month' && historyFilterValue) {
        return shifts.filter((shift) => shift.date?.startsWith(historyFilterValue));
      }

      if (historyFilterType === 'week' && historyFilterValue) {
        return shifts.filter(
          (shift) => startOfWeek(shift.date).toISOString() === historyFilterValue
        );
      }

      if (historyFilterType === 'payPeriod' && historyFilterValue) {
        const selectedPeriod = getPeriods(
          shifts || [],
          settings?.hourlyRate || 0,
          settings?.tipOutRate || 0
        ).find((period) => period.key === historyFilterValue);

        if (!selectedPeriod) {
          return [];
        }

        const periodStart = new Date(selectedPeriod.key);
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 13);

        return shifts.filter((shift) => {
          const shiftDate = new Date(`${shift.date}T00:00:00`);
          return shiftDate >= periodStart && shiftDate <= periodEnd;
        });
      }

      return shifts;
    }

    return shifts.filter((shift) => shift.date === selectedDate);
  }, [
    historyFilterType,
    historyFilterValue,
    selectedDate,
    settings?.hourlyRate,
    settings?.tipOutRate,
    shifts,
  ]);

  const sortedShifts = useMemo(() => sortShiftsNewestFirst(shifts), [shifts]);
  const recentShift = sortedShifts[0];
  const activeHistoryLabel = useMemo(() => {
    if (selectedDate) {
      return `Filtered to ${formatDateLabel(selectedDate)}`;
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
    selectedDate,
    weekOptions,
  ]);

  const topSummary = useMemo(() => {
    if (historyFilterType === 'payPeriod' && historyFilterValue) {
      return {
        modeLabel: 'Selected pay period',
        title: payPeriodStats.label,
        helper: 'These totals are now following the pay period you picked in the filter below.',
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
      helper: 'This snapshot shows the pay period you are currently in right now.',
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

        const savedShift = normalizeShiftRow(data);

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
            ...(data || []).map(normalizeShiftRow),
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

        const restoredShift = normalizeShiftRow(data);

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
    if (isCloudMode) {
      try {
        setCloudError('');

        const { data, error } = await supabase
          .from('settings')
          .upsert(serializeSettings(nextSettings, session.user.id, cloudProfileName))
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
      settings: nextSettings,
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
    setHistoryFilterValue('');
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
        ? shiftsResult.data.map(normalizeShiftRow)
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
          bg={isDarkMode ? 'rgba(15, 23, 42, 0.84)' : 'rgba(247, 245, 241, 0.84)'}
          backdropFilter="blur(18px)"
          borderBottom="1px solid"
          borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(22, 33, 43, 0.06)'}
          px={{ base: 4, md: 6 }}
          py={{ base: 5, md: 6 }}
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
              <Text fontSize="xs" color="brand.600" fontWeight="semibold" letterSpacing="0.18em" textTransform="uppercase">
                Tips Cafe
              </Text>
              <Text mt={2} fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" letterSpacing="-0.03em" color={isDarkMode ? 'white' : '#18222c'}>
                Earnings Tracker
              </Text>
              <HStack spacing={3} mt={1} flexWrap="wrap">
                <Text color={isDarkMode ? 'gray.300' : 'gray.800'} fontSize="sm" maxW="720px" lineHeight="tall">
                  A cleaner way to log shifts, review checks, and see what you actually keep after tip-out.
                </Text>
                <Badge
                  bg={isCloudMode ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.12)'}
                  color={isCloudMode ? 'brand.700' : '#92400e'}
                  borderRadius="full"
                  px={3}
                  py={1}
                  border="1px solid"
                  borderColor={isCloudMode ? 'rgba(59,130,246,0.18)' : 'rgba(245,158,11,0.18)'}
                >
                  {isCloudMode ? 'Synced Account' : 'Local Device Mode'}
                </Badge>
              </HStack>
            </Box>

            <HStack spacing={2} alignSelf={{ base: 'stretch', md: 'center' }} flexWrap="wrap">
              {isCloudMode ? (
                <>
                  <Badge
                    bg={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(22, 33, 43, 0.06)'}
                    color={isDarkMode ? 'gray.100' : 'gray.800'}
                    borderRadius="full"
                    px={3}
                    py={1}
                  >
                    {session.user.email}
                  </Badge>
                  <IconButton
                    icon={<LogOut size={16} />}
                    variant="outline"
                    borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(22, 33, 43, 0.1)'}
                    color={isDarkMode ? 'gray.100' : 'gray.900'}
                    bg={isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'white'}
                    aria-label="Sign out"
                    onClick={handleSignOut}
                  />
                </>
              ) : (
                <>
                  <Select
                    value={activeProfileId}
                    onChange={(event) => handleChangeProfile(event.target.value)}
                    maxW={{ base: 'full', md: '220px' }}
                  >
                    {(profileStore.profiles || []).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="outline"
                    borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(22, 33, 43, 0.1)'}
                    color={isDarkMode ? 'gray.100' : 'gray.900'}
                    onClick={handleCreateProfile}
                  >
                    New Profile
                  </Button>
                </>
              )}

              <IconButton
                icon={isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                variant="outline"
                borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(22, 33, 43, 0.1)'}
                color={isDarkMode ? 'gray.100' : 'gray.900'}
                bg={isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'white'}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setUiMode((current) => (current === 'dark' ? 'light' : 'dark'))}
              />
              <IconButton
                icon={<Settings size={16} />}
                variant="outline"
                borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(22, 33, 43, 0.1)'}
                color={isDarkMode ? 'gray.100' : 'gray.900'}
                bg={isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'white'}
                aria-label="Open settings"
                onClick={() => setIsSettingsOpen(true)}
              />
              <Button
                leftIcon={<Download size={16} />}
                variant="outline"
                borderColor={isDarkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(22, 33, 43, 0.1)'}
                color={isDarkMode ? 'gray.100' : 'gray.900'}
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
              <Button leftIcon={<Plus size={16} />} bg="brand.600" color="white" _hover={{ bg: 'brand.700' }} onClick={openNewShiftDialog}>
                Add Shift
              </Button>
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
                borderRadius="3xl"
                bg="rgba(255, 255, 255, 0.9)"
                border="1px solid rgba(22, 33, 43, 0.06)"
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
              <Alert status="error" mb={4} borderRadius="3xl" bg="red.900" color="red.100">
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

            {isCloudMode ? (
              <Alert
                status="info"
                mb={4}
                borderRadius="3xl"
                bg="rgba(255, 255, 255, 0.9)"
                border="1px solid rgba(22, 33, 43, 0.06)"
              >
                <AlertIcon />
                <AlertDescription>
                  Privacy note: each account is private to the person who signs in, so coworkers
                  cannot see one another&apos;s shifts without the correct password.
                </AlertDescription>
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

            <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4} mb={6}>
              <Box gridColumn={{ base: 'auto', xl: 'span 2' }}>
                <SnapshotCard
                  isDarkMode={isDarkMode}
                  label={topSummary.modeLabel}
                  title={topSummary.title}
                  value={formatCurrency(topSummary.takeHome)}
                  detail={`${topSummary.shifts} ${
                    topSummary.shifts === 1 ? 'shift' : 'shifts'
                  } in this snapshot`}
                  helper={topSummary.helper}
                  accent="#38bdf8"
                  metrics={[
                    {
                      label: 'Hours worked',
                      value: topSummary.hours.toFixed(1),
                      helper: 'Total hours in this pay period',
                    },
                    {
                      label: 'Net tips',
                      value: formatCurrency(topSummary.netTips),
                      helper: 'After tip-out',
                    },
                    {
                      label: 'Tip-out',
                      value: formatCurrency(topSummary.tipOut),
                      helper: `${settings.tipOutRate}% of sales`,
                    },
                    {
                      label: 'Base pay',
                      value: formatCurrency(topSummary.basePay),
                      helper: `${formatCurrency(topSummary.sales)} total sales`,
                    },
                  ]}
                />
              </Box>
              <Box display="grid" gap={4}>
                <SummaryCard
                  icon={TrendingUp}
                  isDarkMode={isDarkMode}
                  label="Net tips"
                  value={formatCurrency(topSummary.netTips)}
                  helper="Money left after the tip-out is removed from your tips."
                  accent="#68d391"
                />
                <SummaryCard
                  icon={TrendingDown}
                  isDarkMode={isDarkMode}
                  label="Tip-out"
                  value={formatCurrency(topSummary.tipOut)}
                  helper="Total paid out from sales for the pay period you are viewing."
                  accent="#fc8181"
                />
                <SummaryCard
                  icon={Target}
                  isDarkMode={isDarkMode}
                  label="Yearly wages"
                  value={formatCurrency(yearlyStats.totalTakeHome)}
                  helper={`${yearlyStats.year} running total across all saved shifts.`}
                  accent="#c084fc"
                />
              </Box>
            </SimpleGrid>

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
                    <option value="month">By month</option>
                    <option value="week">By week</option>
                    <option value="payPeriod">By pay period</option>
                  </Select>
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
                  shifts={shifts}
                  settings={settings}
                  onSelectPeriod={handlePayPeriodSelect}
                />
                <ShiftsByDay
                  isDarkMode={isDarkMode}
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
                isDarkMode={isDarkMode}
                shifts={filteredShifts}
                settings={settings}
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
                shifts={shifts}
                settings={settings}
                onSelectPeriod={handlePayPeriodSelect}
              />
            ) : null}
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
          isDarkMode={isDarkMode}
          isOpen={isAddOpen}
          onClose={closeShiftDialog}
          onSave={handleSaveShift}
          onSaveBatch={handleSaveBatchShifts}
          editingShift={editingShift}
          settings={settings}
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
