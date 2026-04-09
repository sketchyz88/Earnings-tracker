import { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
      Button, FormControl, FormLabel, Input, NumberInput, NumberInputField, Select, Textarea,
      VStack, HStack, Text,
    } from '@chakra-ui/react';

const FLOORS = ['Main Floor', 'Bar', 'Patio', 'Private Room', 'Other'];

const AddShiftDialog = ({ isOpen, onClose, onSave, editingShift }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today, startTime: '', endTime: '', hours: '', tips: '', earnings: '', floor: '', notes: '',
});

  useEffect(() => {
    if (editingShift) {
      setForm({ date: editingShift.date || today, startTime: editingShift.startTime || '', endTime: editingShift.endTime || '', hours: editingShift.hours || '', tips: editingShift.tips || '', earnings: editingShift.earnings || '', floor: editingShift.floor || '', notes: editingShift.notes || '' });
} else {
      setForm({ date: today, startTime: '', endTime: '', hours: '', tips: '', earnings: '', floor: '', notes: '' });
}
}, [editingShift, isOpen]);

  const calcHours = (start, end) => {
    if (!start || !end) return '';
          const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return (diff / 60).toFixed(2);
};

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'startTime' || field === 'endTime') {
        const h = calcHours(updated.startTime, updated.endTime);
        if (h) updated.hours = h;
}
      return updated;
});
};

  const handleSubmit = () => {
    if (!form.date || !form.hours || !form.tips) return;
    onSave({
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      hours: parseFloat(form.hours) || 0,
      tips: parseFloat(form.tips) || 0,
      earnings: parseFloat(form.earnings) || 0,
      floor: form.floor,
      notes: form.notes,
});
};

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{editingShift ? 'Edit Shift' : 'Add Shift'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={3}>
            <FormControl isRequired>
              <FormLabel>Date</FormLabel>
              <Input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} />
            </FormControl>
            <HStack w="full">
              <FormControl>
                <FormLabel>Start Time</FormLabel>
                <Input type="time" value={form.startTime} onChange={e => handleChange('startTime', e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>End Time</FormLabel>
                <Input type="time" value={form.endTime} onChange={e => handleChange('endTime', e.target.value)} />
              </FormControl>
            </HStack>
            <FormControl isRequired>
              <FormLabel>Hours Worked</FormLabel>
              <NumberInput min={0} max={24} value={form.hours} onChange={v => handleChange('hours', v)}>
                <NumberInputField placeholder="e.g. 6.5" />
              </NumberInput>
            </FormControl>
            <HStack w="full">
              <FormControl isRequired>
                <FormLabel>Tips ($)</FormLabel>
                <NumberInput min={0} value={form.tips} onChange={v => handleChange('tips', v)}>
                  <NumberInputField placeholder="0.00" />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Total Earnings ($)</FormLabel>
                <NumberInput min={0} value={form.earnings} onChange={v => handleChange('earnings', v)}>
                  <NumberInputField placeholder="0.00" />
                </NumberInput>
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Floor / Section</FormLabel>
              <Select placeholder="Select floor" value={form.floor} onChange={e => handleChange('floor', e.target.value)}>
{FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea placeholder="Any notes..." value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="teal" onClick={handleSubmit} isDisabled={!form.date || !form.hours || !form.tips}>
{editingShift ? 'Save Changes' : 'Add Shift'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddShiftDialog;
