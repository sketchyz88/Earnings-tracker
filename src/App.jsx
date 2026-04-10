import { useEffect, useMemo, useState } from 'react';
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
  Plus,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import AuthScreen from './components/AuthScreen';
import BiWeeklyHours from './components/BiWeeklyHours';
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
  const [editingShift, setEditingShift] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const stats = useMemo(() => computeStats(shifts, settings), [settings, shifts]);

  const filteredShifts = useMemo(() => {
    if (!selectedDate) {
      return shifts;
    }

    return shifts.filter((shift) => shift.date === selectedDate);
  }, [selectedDate, shifts]);

  const sortedShifts = useMemo(() => sortShiftsNewestFirst(shifts), [shifts]);
  const recentShift = sortedShifts[0];

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
      } catch (error) {
        setCloudError(error.message || 'Unable to save this shift.');
      }

      return;
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
  }

  function handleEditShift(shift) {
    setEditingShift(shift);
    setIsAddOpen(true);
  }

  async function handleDeleteShift(id) {
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
      } catch (error) {
        setCloudError(error.message || 'Unable to delete this shift.');
      }

      return;
    }

    updateActiveProfileData((currentProfileData) => ({
      ...currentProfileData,
      shifts: (currentProfileData.shifts || []).filter((shift) => shift.id !== id),
    }));
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
    setView('byDay');
  }

  function handleChangeProfile(nextProfileId) {
    setActiveProfileId(nextProfileId);
    setSelectedDate('');
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
        isSubmitting={isAuthSubmitting}
        authError={authError}
        authMessage={authMessage}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    );
  } else {
    content = (
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
              <HStack spacing={3} mt={1} flexWrap="wrap">
                <Text color="gray.400" fontSize="sm">
                  Track shifts, monitor pay periods, and compare where your strongest tips come
                  from.
                </Text>
                <Badge colorScheme={isCloudMode ? 'green' : 'orange'} borderRadius="full" px={2.5}>
                  {isCloudMode ? 'Synced Account' : 'Local Device Mode'}
                </Badge>
              </HStack>
            </Box>

            <HStack spacing={2} alignSelf={{ base: 'stretch', md: 'center' }} flexWrap="wrap">
              {isCloudMode ? (
                <>
                  <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                    {session.user.email}
                  </Badge>
                  <IconButton
                    icon={<LogOut size={16} />}
                    variant="outline"
                    borderColor="whiteAlpha.200"
                    color="gray.100"
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
                    bg="#182133"
                    borderColor="whiteAlpha.200"
                  >
                    {(profileStore.profiles || []).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="outline"
                    borderColor="whiteAlpha.200"
                    color="gray.100"
                    onClick={handleCreateProfile}
                  >
                    New Profile
                  </Button>
                </>
              )}

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
              <Button leftIcon={<Plus size={16} />} colorScheme="teal" onClick={openNewShiftDialog}>
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
            {!isSupabaseConfigured ? (
              <Alert
                status="info"
                mb={4}
                borderRadius="2xl"
                bg="#132238"
                border="1px solid rgba(255,255,255,0.08)"
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
                bg="#182133"
                borderRadius="2xl"
                border="1px solid"
                borderColor="whiteAlpha.100"
                align="center"
                gap={3}
              >
                <Spinner size="sm" color="teal.300" />
                <Text color="gray.300">Loading your synced shifts...</Text>
              </Flex>
            ) : null}

            {cloudError ? (
              <Alert status="error" mb={4} borderRadius="2xl" bg="red.900" color="red.100">
                <AlertIcon />
                <AlertDescription>{cloudError}</AlertDescription>
              </Alert>
            ) : null}

            {isCloudMode ? (
              <Alert
                status="info"
                mb={4}
                borderRadius="2xl"
                bg="#132238"
                border="1px solid rgba(255,255,255,0.08)"
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
                bg="#182133"
                borderRadius="2xl"
                border="1px solid"
                borderColor="whiteAlpha.100"
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
                    colorScheme="teal"
                    onClick={handleImportLocalData}
                    isLoading={isImportingLocalData}
                  >
                    Import My Local Data
                  </Button>
                </Flex>
              </Box>
            ) : null}

            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={6}>
              <StatCard
                icon={TrendingUp}
                label="Net tips"
                value={formatCurrency(stats.totalNetTips)}
                helper={`${profileName} • ${formatCurrency(stats.totalTipOut)} total tip-out removed`}
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
    );
  }

  return <ChakraProvider theme={theme}>{content}</ChakraProvider>;
}

export default App;
