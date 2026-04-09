import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, Flex, Heading, Button, IconButton, Text, Spinner, useToast, SimpleGrid, HStack } from '@chakra-ui/react';
import { Plus, Download, Settings } from 'lucide-react';
import AddShiftDialog from './components/AddShiftDialog';
import ShiftsByDay from './components/ShiftsByDay';
import BiWeeklyHours from './components/BiWeeklyHours';
import FloorComparison from './components/FloorComparison';
import CalendarView from './components/CalendarView';
import SettingsDialog from './components/SettingsDialog';

const SK = 'earnings_tracker_shifts';
const SK2 = 'earnings_tracker_settings';
function loadShifts() { try { const d = localStorage.getItem(SK); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveShifts(s) { localStorage.setItem(SK, JSON.stringify(s)); }
function loadSettings() { try { const d = localStorage.getItem(SK2); return d ? JSON.parse(d) : { hourlyRate: 15, tipGoal: 100 }; } catch { return { hourlyRate: 15, tipGoal: 100 }; } }
function saveSettings(s) { localStorage.setItem(SK2, JSON.stringify(s)); }
function computeStats(shifts) {
        if (!shifts || !shifts.length) return { totalHours: 0, totalTips: 0, totalEarnings: 0, avgTipsPerHour: 0 };
        const h = shifts.reduce((a, s) => a + (parseFloat(s.hours) || 0), 0);
        const t = shifts.reduce((a, s) => a + (parseFloat(s.tips) || 0), 0);
        const e = shifts.reduce((a, s) => a + (parseFloat(s.earnings) || 0), 0);
        return { totalHours: h, totalTips: t, totalEarnings: e, avgTipsPerHour: h > 0 ? t / h : 0 };
}
const ce = React.createElement;
function NavBtn({ label, mode, viewMode, setViewMode }) {
        const active = viewMode === mode;
        return ce(Button, { size: 'sm', variant: active ? 'solid' : 'ghost', colorScheme: active ? 'teal' : 'gray', onClick: () => setViewMode(mode) }, label);
}
function StatCard({ label, value }) {
        return ce(Box, { bg:'white', p:4, rounded:'lg', shadow:'sm', border:'1px', borderColor:'gray.200' },
                      ce(Text, { fontSize:'sm', color:'gray.500' }, label),
                      ce(Text, { fontSize:'2xl', fontWeight:'bold', color:'teal.600' }, value)
                    );
}
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
        useEffect(() => { const saved = loadShifts(); setShifts(saved); setStats(computeStats(saved)); setLoading(false); }, []);
        const upd = (u) => { setShifts(u); saveShifts(u); setStats(computeStats(u)); };
        const handleSave = (data) => {
                  const u = editingShift ? shifts.map(s => s.id === editingShift.id ? {...data, id: editingShift.id} : s) : [...shifts, {...data, id: Date.now().toString()}];
                  upd(u); toast({ title: editingShift ? 'Updated' : 'Added', status: 'success', duration: 2000 }); setDialogOpen(false); setEditingShift(null);
        };
        const handleDel = (id) => { upd(shifts.filter(s => s.id !== id)); toast({ title: 'Deleted', status: 'info', duration: 2000 }); };
        const handleExport = () => {
                  const csv = ['Date,Hours,Tips,Earnings,Floor,Notes', ...shifts.map(s => [s.date,s.hours,s.tips,s.earnings,s.floor||'',(s.notes||'').replace(/,/g,';')].join(','))].join('\n');
                  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='shifts.csv'; a.click();
        };
        const openEdit = (s) => { setEditingShift(s); setDialogOpen(true); };
        const navItems = [['dashboard','Dashboard'],['byDay','By Day'],['biweekly','Bi-Weekly'],['floor','Floor'],['calendar','Calendar']];
        const st = stats || { totalHours:0, totalTips:0, totalEarnings:0, avgTipsPerHour:0 };
        const addBtn = ce(Button, { leftIcon: ce(Plus, {size:16}), colorScheme:'whiteAlpha', size:'sm', onClick:()=>{setEditingShift(null);setDialogOpen(true);} }, 'Add Shift');
        const expBtn = ce(IconButton, { icon: ce(Download,{size:16}), colorScheme:'whiteAlpha', size:'sm', 'aria-label':'Export', onClick:handleExport });
        const setBtn = ce(IconButton, { icon: ce(Settings,{size:16}), colorScheme:'whiteAlpha', size:'sm', 'aria-label':'Settings', onClick:()=>setSettingsOpen(true) });
        const header = ce(Box, {bg:'teal.600',px:4,py:3,shadow:'md'}, ce(Flex, {align:'center',justify:'space-between',maxW:'1200px',mx:'auto'}, ce(Heading,{size:'md',color:'white'},'Earnings Tracker'), ce(HStack,null,addBtn,expBtn,setBtn)));
        const navbar = ce(Box, {bg:'white',borderBottom:'1px',borderColor:'gray.200',px:4}, ce(Flex,{maxW:'1200px',mx:'auto',gap:1,py:2,overflowX:'auto'}, ...navItems.map(([m,l]) => ce(NavBtn, {key:m,mode:m,label:l,viewMode,setViewMode}))));
        const dashboard = ce(Box, null, ce(SimpleGrid, {columns:{base:2,md:4},spacing:4,mb:6}, ce(StatCard,{label:'Total Hours',value:st.totalHours.toFixed(1)}), ce(StatCard,{label:'Total Tips',value:'$'+st.totalTips.toFixed(2)}), ce(StatCard,{label:'Total Earnings',value:'$'+st.totalEarnings.toFixed(2)}), ce(StatCard,{label:'Avg Tips/Hr',value:'$'+st.avgTipsPerHour.toFixed(2)})), ce(ShiftsByDay,{shifts,onEdit:openEdit,onDelete:handleDel}));
        const body = ce(Container, {maxW:'1200px',py:6},
                            loading ? ce(Flex,{justify:'center',py:10},ce(Spinner,{size:'xl',color:'teal.500'})) : null,
                            !loading && viewMode === 'dashboard' ? dashboard : null,
                            !loading && viewMode === 'byDay' ? ce(ShiftsByDay,{shifts,onEdit:openEdit,onDelete:handleDel}) : null,
                            !loading && viewMode === 'biweekly' ? ce(BiWeeklyHours,{shifts,settings}) : null,
                            !loading && viewMode === 'floor' ? ce(FloorComparison,{shifts}) : null,
                            !loading && viewMode === 'calendar' ? ce(CalendarView,{shifts,onDateClick:()=>setViewMode('byDay')}) : null
                          );
        const dlg = dialogOpen ? ce(AddShiftDialog,{isOpen:true,onClose:()=>{setDialogOpen(false);setEditingShift(null);},onSave:handleSave,editingShift}) : null;
        const sdlg = settingsOpen ? ce(SettingsDialog,{isOpen:true,onClose:()=>setSettingsOpen(false),onSave:(ns)=>{setSettings(ns);saveSettings(ns);setSettingsOpen(false);toast({title:'Settings saved',status:'success',duration:2000});},settings}) : null;
        return ce(ChakraProvider, null, ce(Box, {minH:'100vh',bg:'gray.50'}, header, navbar, body, dlg, sdlg));
};
export default App;
