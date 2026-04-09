import { useState, useEffect } from 'react';
import { Box, Container, Stack, SimpleGrid, Spinner, Text, Alert, HStack, IconButton } from '@chakra-ui/react';
import { Plus, TrendingUp, Clock, Calendar, LayoutGrid, Download, Settings } from 'lucide-react';
import { ShiftsBoard } from '@api/BoardSDK.js';
import { storage } from '@api/monday-storage';
import PageHeader from '@components/PageHeader';
import KPICard from '@components/KPICard';
import ChartCard from '@components/ChartCard';
import { Bar, Line } from '@charts';
import Button from '@components/Button';
import AddShiftDialog from './components/AddShiftDialog';
import ShiftsByDay from './components/ShiftsByDay';
import BiWeeklyHours from './components/BiWeeklyHours';
import FloorComparison from './components/FloorComparison';
import CalendarView from './components/CalendarView';
import SettingsDialog from './components/SettingsDialog';

const shiftsBoard = new ShiftsBoard();

const App = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [calendarDate, setCalendarDate] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hourlyWage, setHourlyWage] = useState(17.80);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Get current user
      const user = await shiftsBoard.users.me().execute();
      setCurrentUser(user);

      // Load hourly wage from storage
      const { value: storedWage } = await storage().key(`user_${user.id}_wage`).get();
      if (storedWage) {
        setHourlyWage(parseFloat(storedWage));
      }

      // Fetch shifts
      await fetchData(user.id);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError('Failed to initialize app. Please refresh the page.');
      setLoading(false);
    }
  };

  const handleWageUpdate = async (newWage) => {
    if (!currentUser) return;
    
    setHourlyWage(newWage);
    try {
      await storage().key(`user_${currentUser.id}_wage`).set(newWage.toString());
    } catch (err) {
      console.error('Failed to save wage:', err);
    }
  };

  const fetchData = async (userId) => {
    try {
      setLoading(true);
      setError(null);

      const userIdToFilter = userId || currentUser?.id;
      if (!userIdToFilter) {
        throw new Error('No user ID available');
      }

      // Fetch only shifts created by current user
      const itemsResult = await shiftsBoard.items()
        .withColumns(['shiftDate', 'tips', 'hoursWorked', 'tablesServed', 'totalSales', 'guests', 'tabs', 'shiftType', 'section'])
        .execute();

      // Filter client-side by creator ID (server-side filtering by creator not available in SDK)
      const userShifts = itemsResult.items.filter(item => item.creator?.id === userIdToFilter);

      // Calculate aggregates for user's shifts only
      const stats = {
        totalTips: userShifts.reduce((sum, s) => sum + (s.tips || 0), 0),
        totalHours: userShifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0),
        shiftCount: userShifts.length,
        avgTips: userShifts.length > 0 ? userShifts.reduce((sum, s) => sum + (s.tips || 0), 0) / userShifts.length : 0
      };

      setShifts(userShifts);
      setStats(stats);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
      setError('Failed to load your shifts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftAdded = async (newShift) => {
    setShifts([newShift, ...shifts]);
    const newTotal = (stats?.totalTips || 0) + (newShift.tips || 0);
    const newHours = (stats?.totalHours || 0) + (newShift.hoursWorked || 0);
    const newCount = (stats?.shiftCount || 0) + 1;
    setStats({ ...stats, totalTips: newTotal, totalHours: newHours, shiftCount: newCount, avgTips: newTotal / newCount });
    // Refresh data to ensure period calculations are correct
    await fetchData(currentUser?.id);
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setCalendarDate(null);
    setDialogOpen(true);
  };

  const handleCalendarDayClick = (date, dayShifts) => {
    if (dayShifts.length > 0) {
      // Day has shifts - edit the first one (or could show a list)
      handleEdit(dayShifts[0]);
    } else {
      // Empty day - add new shift with this date
      setEditingShift(null);
      setCalendarDate(date);
      setDialogOpen(true);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      // Create CSV content
      const headers = ['Date', 'Shift Type', 'Section', 'Hours', 'Tips (Gross)', 'Total Sales', '4% Tip Out', 'Net Tips', 'Tables', 'Guests', 'Tabs'];
      const rows = shifts.map(shift => {
        const deduction = shift.totalSales ? shift.totalSales * 0.04 : 0;
        const netTips = (shift.tips || 0) - deduction;
        return [
          shift.shiftDate?.toLocaleDateString() || '',
          shift.shiftType || '',
          shift.section || '',
          shift.hoursWorked?.toFixed(2) || '0',
          shift.tips?.toFixed(2) || '0',
          shift.totalSales?.toFixed(2) || '0',
          deduction.toFixed(2),
          netTips.toFixed(2),
          shift.tablesServed || '0',
          shift.guests || '0',
          shift.tabs || '0'
        ];
      });
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tip-tracker-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleShiftUpdated = async (updatedShift) => {
    // SNAP: Snapshot → Now → Async → Problem
    const prev = shifts;
    const prevStats = stats;
    
    // Find old shift to calculate delta
    const oldShift = shifts.find(s => s.id === updatedShift.id);
    
    // Now: Optimistic update
    setShifts(shifts.map(s => s.id === updatedShift.id ? updatedShift : s));
    
    // Update stats with delta
    if (oldShift && stats) {
      const tipsDelta = (updatedShift.tips || 0) - (oldShift.tips || 0);
      const hoursDelta = (updatedShift.hoursWorked || 0) - (oldShift.hoursWorked || 0);
      const newTotal = stats.totalTips + tipsDelta;
      const newHours = stats.totalHours + hoursDelta;
      setStats({
        ...stats,
        totalTips: newTotal,
        totalHours: newHours,
        avgTips: stats.shiftCount > 0 ? newTotal / stats.shiftCount : 0
      });
    }
    
    setEditingShift(null);
    // Refresh data to ensure period calculations are correct
    await fetchData(currentUser?.id);
  };

  const handleDelete = async (id) => {
    const prev = shifts;
    const deletedShift = shifts.find(s => s.id === id);
    setShifts(shifts.filter(s => s.id !== id));
    
    if (deletedShift && stats) {
      const newTotal = stats.totalTips - (deletedShift.tips || 0);
      const newHours = stats.totalHours - (deletedShift.hoursWorked || 0);
      const newCount = stats.shiftCount - 1;
      setStats({ ...stats, totalTips: newTotal, totalHours: newHours, shiftCount: newCount, avgTips: newCount > 0 ? newTotal / newCount : 0 });
    }

    try {
      await shiftsBoard.item(id).archive().execute();
    } catch (err) {
      console.error('Failed to delete shift:', err);
      setShifts(prev);
      setError('Failed to delete shift. Please try again.');
    }
  };

  const tipsOverTime = shifts
    .filter(s => s.shiftDate && s.tips)
    .sort((a, b) => a.shiftDate - b.shiftDate)
    .map(s => ({
      date: s.shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tips: s.tips
    }));

  const avgTipPerHour = shifts
    .filter(s => s.tips && s.hoursWorked && s.hoursWorked > 0)
    .reduce((sum, s) => sum + (s.tips / s.hoursWorked), 0) / (shifts.filter(s => s.tips && s.hoursWorked).length || 1);

  const totalNetTips = shifts.reduce((sum, s) => {
    const deduction = s.totalSales ? s.totalSales * 0.04 : 0;
    return sum + ((s.tips || 0) - deduction);
  }, 0);

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.900" display="flex" alignItems="center" justifyContent="center">
        <Stack align="center" gap={4}>
          <Spinner size="xl" colorPalette="blue" />
          <Text color="gray.300">Loading your shifts...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.900" py={8}>
      <Container maxW="1400px">
        <Stack gap={6}>
          <Box display="flex" flexDirection={{ base: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ base: 'start', md: 'flex-end' }} gap={4}>
            <Box>
              <Text fontSize="3xl" fontWeight="700" color="whiteAlpha.900" mb={1}>Tip Tracker</Text>
              <Text fontSize="md" color="gray.400">Track your earnings and analyze your shifts</Text>
            </Box>
            <HStack gap={3}>
              <IconButton
                size="sm"
                variant="ghost"
                colorPalette="gray"
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings size={18} />
              </IconButton>
              <HStack gap={1} bg="gray.800" p={1} borderRadius="lg">
                <Button
                  size="sm"
                  variant={viewMode === 'dashboard' ? 'solid' : 'ghost'}
                  onClick={() => setViewMode('dashboard')}
                  bg={viewMode === 'dashboard' ? 'blue.600' : 'transparent'}
                  color={viewMode === 'dashboard' ? 'white' : 'gray.400'}
                  _hover={{ bg: viewMode === 'dashboard' ? 'blue.700' : 'gray.750' }}
                >
                  <LayoutGrid size={16} />
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'calendar' ? 'solid' : 'ghost'}
                  onClick={() => setViewMode('calendar')}
                  bg={viewMode === 'calendar' ? 'blue.600' : 'transparent'}
                  color={viewMode === 'calendar' ? 'white' : 'gray.400'}
                  _hover={{ bg: viewMode === 'calendar' ? 'blue.700' : 'gray.750' }}
                >
                  <Calendar size={16} />
                  Calendar
                </Button>
              </HStack>
              {shifts.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExport}
                  loading={exporting}
                  size="sm"
                  display={{ base: 'none', md: 'flex' }}
                >
                  <Download size={16} />
                  Export CSV
                </Button>
              )}
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                <Plus size={18} />
                Add Shift
              </Button>
            </HStack>
          </Box>

          {error && (
            <Alert.Root colorPalette="red">
              <Alert.Indicator />
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
            <KPICard
              value={`$${Math.round(stats?.totalTips || 0).toLocaleString()}`}
              label="Tips Earned (Gross)"
              icon={<TrendingUp size={28} />}
            />
            <KPICard
              value={`$${Math.round(totalNetTips).toLocaleString()}`}
              label="Net Take-Home"
              icon={<TrendingUp size={28} />}
            />
            <KPICard
              value={`$${Math.round(avgTipPerHour || 0)}`}
              label="Avg Tip/Hour"
              icon={<Clock size={28} />}
            />
            <KPICard
              value={`$${Math.round(stats?.avgTips || 0)}`}
              label="Avg Per Shift"
              icon={<TrendingUp size={28} />}
            />
          </SimpleGrid>

          {viewMode === 'calendar' ? (
            <Box>
                {shifts.length > 0 ? (
                  <CalendarView shifts={shifts} onDayClick={handleCalendarDayClick} />
                ) : (
                <Box bg="gray.800" p={12} borderRadius="xl" textAlign="center">
                  <Text fontSize="lg" fontWeight="600" color="whiteAlpha.900" mb={2}>No shifts yet</Text>
                  <Text color="gray.400" mb={4}>Start tracking your tips by adding your first shift</Text>
                  <Button variant="primary" onClick={() => setDialogOpen(true)}>
                    <Plus size={18} />
                    Add Your First Shift
                  </Button>
                </Box>
              )}
            </Box>
          ) : shifts.length > 0 ? (
            <>
              <Box>
                <Text fontSize="lg" fontWeight="600" mb={4} color="whiteAlpha.900">Hours by 2-Week Period</Text>
                <BiWeeklyHours shifts={shifts} onEdit={handleEdit} onDelete={handleDelete} hourlyWage={hourlyWage} />
              </Box>

              <Box>
                <Text fontSize="lg" fontWeight="600" mb={4} color="whiteAlpha.900">Floor 1 vs Floor 2 Performance</Text>
                <FloorComparison shifts={shifts} />
              </Box>

              <Box>
                <ChartCard title="Tips Over Time" subtitle="Your earnings trend">
                  <Line data={tipsOverTime} xField="date" yField="tips" enableArea smoothing />
                </ChartCard>
              </Box>

              <Box>
                <Text fontSize="lg" fontWeight="600" mb={4} color="whiteAlpha.900">All Shifts by Day</Text>
                <ShiftsByDay shifts={shifts} onDelete={handleDelete} onEdit={handleEdit} />
              </Box>
            </>
          ) : (
            <Box bg="gray.800" p={12} borderRadius="xl" textAlign="center">
              <Text fontSize="lg" fontWeight="600" color="whiteAlpha.900" mb={2}>No shifts yet</Text>
              <Text color="gray.400" mb={4}>Start tracking your tips by adding your first shift</Text>
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                <Plus size={18} />
                Add Your First Shift
              </Button>
            </Box>
          )}
        </Stack>
      </Container>

      <AddShiftDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingShift(null);
            setCalendarDate(null);
          }
        }} 
        onShiftAdded={handleShiftAdded}
        editShift={editingShift}
        onShiftUpdated={handleShiftUpdated}
        initialDate={calendarDate}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentWage={hourlyWage}
        onWageUpdate={handleWageUpdate}
      />
    </Box>
  );
};

export default App;
