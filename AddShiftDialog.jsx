import { useState, useEffect } from 'react';
import { Dialog, Portal, Field, Input, Button, Stack, Select, createListCollection, CloseButton, HStack, Text, Box, SimpleGrid, VStack } from '@chakra-ui/react';
import { ShiftsBoard } from '@api/BoardSDK.js';

const shiftsBoard = new ShiftsBoard();

const shiftTypes = createListCollection({
  items: [
    { label: 'Dinner', value: 'Dinner' },
    { label: 'Brunch', value: 'Brunch' },
    { label: 'Lunch', value: 'Lunch' }
  ]
});

const sections = createListCollection({
  items: [
    { label: 'Floor 1', value: 'Floor 1' },
    { label: 'Floor 2', value: 'Floor 2' }
  ]
});

const AddShiftDialog = ({ open, onOpenChange, onShiftAdded, editShift, onShiftUpdated, initialDate }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Helper to convert hours to time strings (HH:MM)
  const hoursToTime = (hours) => {
    if (!hours) return '';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getInitialFormData = () => {
    if (editShift) {
      // Pre-populate with edit data
      // Leave time fields blank - preserve stored hours unless user updates times
      return {
        date: editShift.shiftDate ? editShift.shiftDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        tips: editShift.tips?.toString() || '',
        totalSales: editShift.totalSales?.toString() || '',
        timeIn: '',
        timeOut: '',
        tables: editShift.tablesServed?.toString() || '',
        guests: editShift.guests?.toString() || '',
        tabs: editShift.tabs?.toString() || '',
        shiftType: editShift.shiftType || 'Dinner',
        section: editShift.section || 'Floor 1'
      };
    }
    // Use initialDate if provided (from calendar click), otherwise today
    const dateToUse = initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return {
      date: dateToUse,
      tips: '',
      totalSales: '',
      timeIn: '',
      timeOut: '',
      tables: '',
      guests: '',
      tabs: '',
      shiftType: 'Dinner',
      section: 'Floor 1'
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Reset form when editShift or initialDate changes
  useEffect(() => {
    setFormData(getInitialFormData());
  }, [editShift?.id, initialDate]);

  const calculateHours = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;
    const [inH, inM] = timeIn.split(':').map(Number);
    const [outH, outM] = timeOut.split(':').map(Number);
    let hours = outH - inH;
    let minutes = outM - inM;
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    if (hours < 0) hours += 24; // Handle overnight shifts
    return hours + minutes / 60;
  };

  // Calculate hours from time inputs, or use existing hours from edit mode
  const calculatedHours = calculateHours(formData.timeIn, formData.timeOut);
  const hoursWorked = calculatedHours > 0 ? calculatedHours : (editShift?.hoursWorked || 0);
  
  // Display message for edit mode when times aren't filled in
  const usingStoredHours = editShift && calculatedHours === 0 && editShift.hoursWorked > 0;
  const deduction = formData.totalSales ? (parseFloat(formData.totalSales) * 0.04) : 0;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    const tips = parseFloat(formData.tips);
    if (formData.tips && (isNaN(tips) || tips < 0)) {
      newErrors.tips = 'Tips cannot be negative';
    }

    const totalSales = parseFloat(formData.totalSales);
    if (formData.totalSales && (isNaN(totalSales) || totalSales < 0)) {
      newErrors.totalSales = 'Total sales cannot be negative';
    }

    const hours = calculateHours(formData.timeIn, formData.timeOut);
    if (hours > 24) {
      newErrors.time = 'Shift cannot exceed 24 hours';
    }

    const tables = parseInt(formData.tables);
    if (formData.tables && (isNaN(tables) || tables < 0)) {
      newErrors.tables = 'Tables cannot be negative';
    }

    const guests = parseInt(formData.guests);
    if (formData.guests && (isNaN(guests) || guests < 0)) {
      newErrors.guests = 'Guests cannot be negative';
    }

    const tabs = parseInt(formData.tabs);
    if (formData.tabs && (isNaN(tabs) || tabs < 0)) {
      newErrors.tabs = 'Tabs cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Calculate hours: use time-based calculation if available, else keep existing
      const finalHours = calculateHours(formData.timeIn, formData.timeOut);
      
      // Parse date in local timezone to avoid UTC conversion issues
      const [year, month, day] = formData.date.split('-');
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      const shiftData = {
        name: `${formData.shiftType} - ${formData.date}`,
        shiftDate: localDate,
        tips: parseFloat(formData.tips) || 0,
        hoursWorked: finalHours > 0 ? finalHours : (editShift?.hoursWorked || 0),
        tablesServed: parseInt(formData.tables) || 0,
        totalSales: parseFloat(formData.totalSales) || 0,
        guests: parseInt(formData.guests) || 0,
        tabs: parseInt(formData.tabs) || 0,
        shiftType: formData.shiftType,
        section: formData.section
      };

      if (editShift) {
        // Update existing shift
        const updated = await shiftsBoard.item(editShift.id).update(shiftData)
          .returnColumns(['shiftDate', 'tips', 'hoursWorked', 'tablesServed', 'totalSales', 'guests', 'tabs', 'shiftType', 'section'])
          .execute();
        
        onShiftUpdated?.(updated);
      } else {
        // Create new shift
        const created = await shiftsBoard.item().create(shiftData)
          .returnColumns(['shiftDate', 'tips', 'hoursWorked', 'tablesServed', 'totalSales', 'guests', 'tabs', 'shiftType', 'section'])
          .execute();
        
        onShiftAdded?.(created);
      }

      // Reset form to initial state
      setFormData(getInitialFormData());
      onOpenChange(false);
    } catch (err) {
      console.error(editShift ? 'Failed to update shift:' : 'Failed to create shift:', err);
      alert(editShift ? 'Failed to update shift. Please try again.' : 'Failed to add shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.800" borderColor="gray.700">
            <Dialog.Header>
              <Dialog.Title color="whiteAlpha.900">{editShift ? 'Edit Shift' : 'Add New Shift'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Field.Root invalid={!!errors.date}>
                  <Field.Label color="gray.300">Shift Date *</Field.Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      setErrors({ ...errors, date: '' });
                    }}
                  />
                  {errors.date && <Field.ErrorText color="red.400">{errors.date}</Field.ErrorText>}
                </Field.Root>

                <Field.Root invalid={!!errors.totalSales}>
                  <Field.Label color="gray.300">Total Sales ($)</Field.Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.totalSales}
                    onChange={(e) => {
                      setFormData({ ...formData, totalSales: e.target.value });
                      setErrors({ ...errors, totalSales: '' });
                    }}
                    bg="gray.700"
                    borderColor="gray.600"
                    color="whiteAlpha.900"
                    _placeholder={{ color: "gray.500" }}
                  />
                  {errors.totalSales && <Field.ErrorText color="red.400">{errors.totalSales}</Field.ErrorText>}
                  {formData.totalSales && (
                    <Box mt={2} p={3} bg="orange.900" borderRadius="md" borderWidth="1px" borderColor="orange.700">
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="orange.200">4% Deduction (Tip Out):</Text>
                        <Text fontSize="md" fontWeight="700" color="orange.300">-${deduction.toFixed(2)}</Text>
                      </HStack>
                    </Box>
                  )}
                </Field.Root>

                <Field.Root invalid={!!errors.tips}>
                  <Field.Label color="gray.300">Tips Earned ($)</Field.Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.tips}
                    onChange={(e) => {
                      setFormData({ ...formData, tips: e.target.value });
                      setErrors({ ...errors, tips: '' });
                    }}
                    bg="gray.700"
                    borderColor="gray.600"
                    color="whiteAlpha.900"
                    _placeholder={{ color: "gray.500" }}
                  />
                  {errors.tips && <Field.ErrorText color="red.400">{errors.tips}</Field.ErrorText>}
                </Field.Root>

                      <SimpleGrid columns={2} gap={4}>
                      <Field.Root invalid={!!errors.time}>
                      <Field.Label color="gray.300">Time In</Field.Label>
                    <Input
                  type="time"
                value={formData.timeIn}
                  onChange={(e) => {
                    setFormData({ ...formData, timeIn: e.target.value });
                    setErrors({ ...errors, time: '' });
                  }}
                    bg="gray.700"
                    borderColor="gray.600"
                      color="whiteAlpha.900"
                      />
                      </Field.Root>

                  <Field.Root invalid={!!errors.time}>
                <Field.Label color="gray.300">Time Out</Field.Label>
                <Input
                type="time"
                  value={formData.timeOut}
                    onChange={(e) => {
                      setFormData({ ...formData, timeOut: e.target.value });
                      setErrors({ ...errors, time: '' });
                    }}
                  bg="gray.700"
                borderColor="gray.600"
                color="whiteAlpha.900"
                />
                  </Field.Root>
                    </SimpleGrid>
                    {errors.time && <Text fontSize="sm" color="red.400">{errors.time}</Text>}

                      {formData.timeIn && formData.timeOut && (
                      <Text fontSize="sm" color="gray.400">
                      Hours worked: {calculateHours(formData.timeIn, formData.timeOut).toFixed(2)}h
                      </Text>
                    )}
                    {usingStoredHours && (
                      <Text fontSize="sm" color="blue.300">
                        Using stored hours: {editShift.hoursWorked.toFixed(2)}h (enter times above to update)
                      </Text>
                    )}

                <SimpleGrid columns={2} gap={4}>
                  <Field.Root invalid={!!errors.tables}>
                    <Field.Label color="gray.300">Tables Served</Field.Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.tables}
                      onChange={(e) => {
                        setFormData({ ...formData, tables: e.target.value });
                        setErrors({ ...errors, tables: '' });
                      }}
                    bg="gray.700"
                  borderColor="gray.600"
                color="whiteAlpha.900"
                _placeholder={{ color: "gray.500" }}
                />
                {errors.tables && <Field.ErrorText color="red.400">{errors.tables}</Field.ErrorText>}
                  </Field.Root>

                    <Field.Root invalid={!!errors.guests}>
                    <Field.Label color="gray.300">Guests</Field.Label>
                    <Input
                    type="number"
                  placeholder="0"
                  min="0"
                value={formData.guests}
                onChange={(e) => {
                  setFormData({ ...formData, guests: e.target.value });
                  setErrors({ ...errors, guests: '' });
                }}
                bg="gray.700"
                  borderColor="gray.600"
                                      color="whiteAlpha.900"
                                      _placeholder={{ color: "gray.500" }}
                                    />
                                    {errors.guests && <Field.ErrorText color="red.400">{errors.guests}</Field.ErrorText>}
                                  </Field.Root>
                                </SimpleGrid>

                                <Field.Root invalid={!!errors.tabs}>
                                  <Field.Label color="gray.300">Tabs Closed</Field.Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={formData.tabs}
                                    onChange={(e) => {
                                      setFormData({ ...formData, tabs: e.target.value });
                                      setErrors({ ...errors, tabs: '' });
                                    }}
                                    bg="gray.700"
                                    borderColor="gray.600"
                                    color="whiteAlpha.900"
                                    _placeholder={{ color: "gray.500" }}
                                  />
                                  {errors.tabs && <Field.ErrorText color="red.400">{errors.tabs}</Field.ErrorText>}
                                </Field.Root>

                                <Field.Root>
                                  <Field.Label color="gray.300">Shift Type</Field.Label>
                  <Select.Root
                    collection={shiftTypes}
                    value={[formData.shiftType]}
                    onValueChange={(e) => setFormData({ ...formData, shiftType: e.value[0] })}
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Select shift type" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {shiftTypes.items.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label color="gray.300">Section</Field.Label>
                  <Select.Root
                    collection={sections}
                    value={[formData.section]}
                    onValueChange={(e) => setFormData({ ...formData, section: e.value[0] })}
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Select section" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {sections.items.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={loading}>Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="blue" onClick={handleSubmit} loading={loading}>
                {editShift ? 'Update Shift' : 'Save Shift'}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default AddShiftDialog;
