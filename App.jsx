import { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, Flex, Heading, Button, IconButton, Text, Spinner, Alert, AlertIcon, useToast, SimpleGrid, HStack } from '@chakra-ui/react';
import { Plus, TrendingUp, Clock, Calendar, LayoutGrid, Download, Settings } from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import ShiftsByDay from './components/ShiftsByDay';
import BiWeeklyHours from './components/BiWeeklyHours';
import FloorComparison from './components/FloorComparison';
import CalendarView from './components/CalendarView';
import SettingsDialog from './components/SettingsDialog';

const STORAGE_KEY = 'earnings_tracker_shifts';
const SETTINGS_KEY = 'earnings_tracker_settings';

function loadShifts() {
      try {
              const data = localStorage.getItem(STORAGE_KEY);
              return data ? JSON.parse(data) : [];
      } catch {
              return [];
      }
}

function saveShifts(shifts) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

function loadSettings() {
      try {
              const data = localStorage.getItem(SETTINGS_KEY);
              return data ? JSON.parse(data) : { hourlyRate: 15, tipGoal: 100 };
      } catch {
              return { hourlyRate: 15, tipGoal: 100 };
      }
}

function saveSettings(settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function computeStats(shifts) {
      if (!shifts || shifts.length === 0) return { totalHours: 0, totalTips: 0, totalEarnings: 0, avgTipsPerHour: 0 };
      const totalHours = shifts.reduce((s, sh) => s + (parseFloat(sh.hours) || 0), 0);
      const totalTips = shifts.reduce((s, sh) => s + (parseFloat(sh.tips) || 0), 0);
      const totalEarnings = shifts.reduce((s, sh) => s + (parseFloat(sh.earnings) || 0), 0);
      const avgTipsPerHour = totalHours > 0 ? totalTips / totalHours : 0;
      return { totalHours, totalTips, totalEarnings, avgTipsPerHour };
}

const NAV = [
    { mode: 'dashboard', label: 'Dashboard' },
    { mode: 'byDay', label: 'By Day' },
    { mode: 'biweekly', label: 'Bi-Weekly' },
    { mode: 'floor', label: 'Floor' },
    { mode: 'calendar', label: 'Calendar' },
    ];

const App = () => {
      const [shifts, setShifts] = useState([]);
      const [loading, setLoading] = useState(true);
      const [dialogOpen, setDialogOpen] = useState(false);
      const [editingShift, setEditingShift] = useState(null);
      const [stats, setStats] = useState(null);
      const [viewMode, setViewMode] = useState('dashboard');
      const [settings, setSettings] = useState(loadSettings());
      const [settingsOpen, setSettingsOpen] = useState(false);
      const toast = useToast();

      useEffect(() => {
              const saved = loadShifts();
              setShifts(saved);
              setStats(computeStats(saved));
              setLoading(false);
      }, []);

      const handleSaveShift = (shiftData) => {
              let updated;
              if (editingShift) {
                        updated = shifts.map(s => s.id === editingShift.id ? { ...shiftData, id: editingShift.id } : s);
                        toast({ title: 'Shift updated', status: 'success', duration: 2000 });
              } else {
                        const newShift = { ...shiftData, id: Date.now().toString() };
                        updated = [...shifts, newShift];
                        toast({ title: 'Shift added', status: 'success', duration: 2000 });
              }
              setShifts(updated);
              saveShifts(updated);
              setStats(computeStats(updated));
              setDialogOpen(false);
              setEditingShift(null);
      };

      const handleDeleteShift = (shiftId) => {
              const updated = shifts.filter(s => s.id !== shiftId);
              setShifts(updated);
              saveShifts(updated);
              setStats(computeStats(updated));
              toast({ title: 'Shift deleted', status: 'info', duration: 2000 });
      };

      const handleExport = () => {
              const csv = ['Date,Hours,Tips,Earnings,Floor,Notes', ...shifts.map(s =>
                        `${s.date},${s.hours},${s.tips},${s.earnings},${s.floor || ''},${(s.notes || '').replace(/,/g, ';')}`
                                                                                     )].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'shifts.csv';
              a.click();
              URL.revokeObjectURL(url);
      };

      return (
              <ChakraProvider>
                    <Box minH="100vh" bg="gray.50">
                            <Box bg="teal.600" px={4} py={3} shadow="md">
                                      <Flex align="center" justify="space-between" maxW="1200px" mx="auto">
                                                  <Heading size="md" color="white">Earnings Tracker</Heading>Heading>
                                                  <HStack>
                                                                <Button leftIcon={<Plus size={16} />} colorScheme="whiteAlpha" size="sm" onClick={() => { setEditingShift(null); setDialogOpen(true); }}>Add Shift</Button>Button>
                                                                <IconButton icon={<Download size={16} />} colorScheme="whiteAlpha" size="sm" aria-label="Export" onClick={handleExport} />
                                                                <IconButton icon={<Settings size={16} />} colorScheme="whiteAlpha" size="sm" aria-label="Settings" onClick={() => setSettingsOpen(true)} />
                                                  </HStack>HStack>
                                      </Flex>Flex>
                            </Box>Box>
                    
                            <Box bg="white" borderBottom="1px" borderColor="gray.200" px={4}>
                                      <Flex maxW="1200px" mx="auto" gap={1} py={2} overflowX="auto">
                                          {NAV.map(btn => (
                                <Button key={btn.mode} size="sm" variant={viewMode === btn.mode ? 'solid' : 'ghost'} colorScheme={viewMode === btn.mode ? 'teal' : 'gray'} onClick={() => setViewMode(btn.mode)}>{btn.label}</Button>Button>
                              ))}
                                      </Flex>Flex>
                            </Box>Box>
                    
                            <Container maxW="1200px" py={6}>
                                {loading && <Flex justify="center" py={10}><Spinner size="xl" color="teal.500" /></Flex>Flex>}
                                {!loading && (
                              <Box>
                                  {viewMode === 'dashboard' && (
                                                  <Box>
                                                                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
                                                                        {[
                                                      { label: 'Total Hours', value: stats ? stats.totalHours.toFixed(1) : '0' },
                                                      { label: 'Total Tips', value: stats ? '$' + stats.totalTips.toFixed(2) : '$0' },
                                                      { label: 'Total Earnings', value: stats ? '$' + stats.totalEarnings.toFixed(2) : '$0' },
                                                      { label: 'Avg Tips/Hr', value: stats ? '$' + stats.avgTipsPerHour.toFixed(2) : '$0' },
                                                                          ].map(card => (
                                                                                                    <Box key={card.label} bg="white" p={4} rounded="lg" shadow="sm" border="1px" borderColor="gray.200">
                                                                                                                            <Text fontSize="sm" color="gray.500">{card.label}</Text>Text>
                                                                                                                            <Text fontSize="2xl" fontWeight="bold" color="teal.600">{card.value}</Text>Text>
                                                                                                        </Box>Box>
                                                                                                  ))}
                                                                    </SimpleGrid>SimpleGrid>
                                                                    <ShiftsByDay shifts={shifts} onEdit={(s) => { setEditingShift(s); setDialogOpen(true); }} onDelete={handleDeleteShift} />
                                                  </Box>Box>
                                            )}
                                  {viewMode === 'byDay' && <ShiftsByDay shifts={shifts} onEdit={(s) => { setEditingShift(s); setDialogOpen(true); }} onDelete={handleDeleteShift} />}
                                  {viewMode === 'biweekly' && <BiWeeklyHours shifts={shifts} settings={settings} />}
                                  {viewMode === 'floor' && <FloorComparison shifts={shifts} />}
                                  {viewMode === 'calendar' && <CalendarView shifts={shifts} onDateClick={(date) => setViewMode('byDay')} />}
                              </Box>Box>
                                      )}
                            </Container>Container>
                    
                        {dialogOpen && (
                            <AddShiftDialog isOpen={dialogOpen} onClose={() => { setDialogOpen(false); setEditingShift(null); }} onSave={handleSaveShift} editingShift={editingShift} />
                          )}
                        {settingsOpen && (
                            <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSave={(s) => { setSettings(s); saveSettings(s); setSettingsOpen(false); toast({ title: 'Settings saved', status: 'success', duration: 2000 }); }} settings={settings} />
                          )}
                    </Box>Box>
              </ChakraProvider>ChakraProvider>
            );
};

export default App;</ChakraProvider>
