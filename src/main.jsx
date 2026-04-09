import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, Box, Flex, Heading, Button, IconButton, Text, SimpleGrid, extendTheme } from '@chakra-ui/react';
import { Plus, Download, Settings, TrendingUp, Clock } from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import ShiftsByDay from './components/ShiftsByDay';
import BiWeeklyHours from './components/BiWeeklyHours';
import FloorComparison from './components/FloorComparison';
import CalendarView from './components/CalendarView';
import SettingsDialog from './components/SettingsDialog';

const darkTheme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  styles: { global: { body: { bg: '#1a1f2e', color: 'white' } } },
});

const SK = 'earnings_tracker_shifts';
const SK2 = 'earnings_tracker_settings';
function loadShifts() { try { const d = localStorage.getItem(SK); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveShifts(s) { localStorage.setItem(SK, JSON.stringify(s)); }
function loadSettings() { try { const d = localStorage.getItem(SK2); return d ? JSON.parse(d) : { hourlyRate: 15, tipGoal: 100, hoursGoal: 80 }; } catch { return { hourlyRate: 15, tipGoal: 100, hoursGoal: 80 }; } }
function saveSettings(s) { localStorage.setItem(SK2, JSON.stringify(s)); }

function computeStats(shifts) {
  if (!shifts || !shifts.length) return { totalHours: 0, totalTips: 0, totalEarnings: 0, avgTipsPerHour: 0, avgPerShift: 0 };
  const h = shifts.reduce((a, s) => a + (parseFloat(s.hours) || 0), 0);
  const t = shifts.reduce((a, s) => a + (parseFloat(s.tips) || 0), 0);
  const e = shifts.reduce((a, s) => a + (parseFloat(s.earnings) || 0), 0);
  return { totalHours: h, totalTips: t, totalEarnings: e, avgTipsPerHour: h > 0 ? t / h : 0, avgPerShift: shifts.length > 0 ? t / shifts.length : 0 };
}

const ce = React.createElement;

function StatCard({ label, value, icon, color }) {
  return ce(Box, {
    bg: '#252d3d',
    borderRadius: 'xl',
    p: 6,
    border: '1px solid',
    borderColor: 'whiteAlpha.100',
    flex: 1,
  },
    ce(Flex, { justify: 'space-between', align: 'flex-start' },
      ce(Box, null,
        ce(Text, { fontSize: '3xl', fontWeight: 'bold', color: color || 'white', lineHeight: 1.1 }, value),
        ce(Text, { fontSize: 'sm', color: 'gray.400', mt: 1 }, label)
      ),
      ce(Box, { color: color || 'gray.500', opacity: 0.6 }, icon)
    )
  );
}

function App() {
  const [shifts, setShifts] = useState(loadShifts);
  const [settings, setSettings] = useState(loadSettings);
  const [view, setView] = useState('dashboard');
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { saveShifts(shifts); }, [shifts]);

  const stats = computeStats(shifts);

  const handleAdd = (shift) => {
    setShifts(prev => [{ ...shift, id: Date.now().toString() }, ...prev]);
  };

  const handleDelete = (id) => setShifts(prev => prev.filter(s => s.id !== id));

  const handleSaveSettings = (s) => { setSettings(s); saveSettings(s); };

  const exportCSV = () => {
    const rows = [['Date','Hours','Tips','Earnings','Floor','Notes'],
      ...shifts.map(s => [s.date, s.hours, s.tips, s.earnings, s.floor || '', s.notes || ''])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'shifts.csv'; a.click();
  };

  const views = [['dashboard','Dashboard'],['byDay','By Day'],['biWeekly','Bi-Weekly'],['floor','Floor'],['calendar','Calendar']];

  const navBtns = views.map(([m, label]) =>
    ce(Button, {
      key: m,
      size: 'sm',
      variant: 'ghost',
      bg: view === m ? '#3b82f6' : 'transparent',
      color: view === m ? 'white' : 'gray.400',
      _hover: { bg: view === m ? '#2563eb' : 'whiteAlpha.100', color: 'white' },
      borderRadius: 'md',
      onClick: () => setView(m),
    }, label)
  );

  const header = ce(Box, { bg: '#0f1420', borderBottom: '1px solid', borderColor: 'whiteAlpha.100', px: 6, py: 3 },
    ce(Flex, { align: 'center', justify: 'space-between', wrap: 'wrap', gap: 2 },
      ce(Box, null,
        ce(Text, { fontSize: 'xl', fontWeight: 'bold', color: 'white' }, 'Tip Tracker'),
        ce(Text, { fontSize: 'xs', color: 'gray.500' }, 'Track your earnings and analyze your shifts')
      ),
      ce(Flex, { gap: 2, align: 'center' },
        ce(IconButton, { icon: ce(Settings, { size: 16 }), variant: 'ghost', color: 'gray.400', size: 'sm', 'aria-label': 'Settings', _hover: { color: 'white', bg: 'whiteAlpha.100' }, onClick: () => setSettingsOpen(true) }),
        ce(Button, { leftIcon: ce(Download, { size: 14 }), size: 'sm', variant: 'outline', borderColor: 'whiteAlpha.300', color: 'white', _hover: { bg: 'whiteAlpha.100' }, onClick: exportCSV }, 'Export CSV'),
        ce(Button, { leftIcon: ce(Plus, { size: 14 }), size: 'sm', bg: '#3b82f6', color: 'white', _hover: { bg: '#2563eb' }, onClick: () => setAddOpen(true) }, 'Add Shift')
      )
    )
  );

  const nav = ce(Box, { bg: '#0f1420', borderBottom: '1px solid', borderColor: 'whiteAlpha.100', px: 6, pb: 2, pt: 1 },
    ce(Flex, { gap: 1 }, ...navBtns)
  );

  const statCards = ce(SimpleGrid, { columns: { base: 2, md: 4 }, spacing: 4, mb: 6 },
    ce(StatCard, { label: 'Tips Earned (Gross)', value: '$' + stats.totalTips.toFixed(0), icon: ce(TrendingUp, { size: 28 }), color: '#4ade80' }),
    ce(StatCard, { label: 'Total Earnings', value: '$' + stats.totalEarnings.toFixed(0), icon: ce(TrendingUp, { size: 28 }), color: '#4ade80' }),
    ce(StatCard, { label: 'Avg Tip/Hour', value: '$' + stats.avgTipsPerHour.toFixed(0), icon: ce(Clock, { size: 28 }), color: 'white' }),
    ce(StatCard, { label: 'Avg Per Shift', value: '$' + stats.avgPerShift.toFixed(0), icon: ce(TrendingUp, { size: 28 }), color: 'white' })
  );

  let content = null;
  if (view === 'dashboard') {
    content = ce(Box, null,
      statCards,
      shifts.length === 0
        ? ce(Box, { textAlign: 'center', py: 20 },
            ce(Text, { color: 'gray.500', fontSize: 'lg' }, 'No shifts logged yet.'),
            ce(Text, { color: 'gray.600', fontSize: 'sm' }, 'Click "Add Shift" to get started!')
          )
        : ce(BiWeeklyHours, { shifts, settings })
    );
  } else if (view === 'byDay') {
    content = ce(ShiftsByDay, { shifts, onDelete: handleDelete });
  } else if (view === 'biWeekly') {
    content = ce(BiWeeklyHours, { shifts, settings });
  } else if (view === 'floor') {
    content = ce(FloorComparison, { shifts });
  } else if (view === 'calendar') {
    content = ce(CalendarView, { shifts });
  }

  return ce(ChakraProvider, { theme: darkTheme },
    ce(Box, { minH: '100vh', bg: '#1a1f2e' },
      header,
      nav,
      ce(Box, { px: 6, py: 6 }, content),
      ce(AddShiftDialog, { isOpen: addOpen, onClose: () => setAddOpen(false), onAdd: handleAdd }),
      ce(SettingsDialog, { isOpen: settingsOpen, onClose: () => setSettingsOpen(false), onSave: handleSaveSettings, settings })
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(ce(App, null));
