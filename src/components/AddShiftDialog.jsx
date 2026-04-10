import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Progress,
  Select,
  Textarea,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Camera } from 'lucide-react';
import { parseReceiptText } from '../utils/receiptParser';

const FLOORS = ['Floor 1', 'Floor 2'];

function today() {
  return new Date().toISOString().split('T')[0];
}

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) {
    return '';
  }

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  let totalMinutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  if (totalMinutes < 0) {
    totalMinutes += 1440;
  }

  return (totalMinutes / 60).toFixed(2);
}

function createEmptyForm() {
  return {
    date: today(),
    startTime: '17:00',
    endTime: '',
    hours: '',
    sales: '',
    tips: '',
    earnings: '',
    floor: '',
    notes: '',
  };
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function AddShiftDialog({ isOpen, onClose, onSave, editingShift, settings }) {
  const [form, setForm] = useState(createEmptyForm);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSummary, setScanSummary] = useState([]);
  const [isDraggingReceipt, setIsDraggingReceipt] = useState(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingShift) {
      setForm({
        date: editingShift.date || today(),
        startTime: editingShift.startTime || '',
        endTime: editingShift.endTime || '',
        hours: String(editingShift.hours ?? ''),
        sales: String(editingShift.sales ?? ''),
        tips: String(editingShift.tips ?? ''),
        earnings: String(editingShift.earnings ?? ''),
        floor: editingShift.floor || '',
        notes: editingShift.notes || '',
      });
      return;
    }

    if (isOpen) {
      setForm(createEmptyForm());
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
      setScanError('');
      setScanSummary([]);
      setIsDraggingReceipt(false);
    }
  }, [editingShift, isOpen]);

  const suggestedBasePay = useMemo(() => {
    const hours = Number(form.hours) || 0;
    return hours * (settings?.hourlyRate || 0);
  }, [form.hours, settings?.hourlyRate]);

  const estimatedTipOut = useMemo(() => {
    const sales = Number(form.sales) || 0;
    return sales * ((Number(settings?.tipOutRate) || 0) / 100);
  }, [form.sales, settings?.tipOutRate]);

  function updateField(field, value) {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [field]: value };
      if (field === 'startTime' || field === 'endTime') {
        const nextHours = calculateHours(nextForm.startTime, nextForm.endTime);
        if (nextHours) {
          nextForm.hours = nextHours;
        }
      }
      return nextForm;
    });
  }

  async function processReceiptFile(file) {
    if (!file) {
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Preparing OCR');
    setScanError('');

    try {
      const { default: Tesseract } = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng', {
        logger(message) {
          if (typeof message.progress === 'number') {
            setScanProgress(Math.round(message.progress * 100));
          }
          if (message.status) {
            setScanStatus(message.status);
          }
        },
      });

      const parsed = parseReceiptText(result.data.text);

      if (!parsed.summary.length) {
        throw new Error('The receipt was scanned, but I could not confidently find sales or tip amounts.');
      }

      setScanSummary(parsed.summary);
      setForm((currentForm) => {
        const nextStartTime = currentForm.startTime || '17:00';
        const nextEndTime = parsed.fields.endTime || currentForm.endTime;
        const nextHours = calculateHours(nextStartTime, nextEndTime);

        return {
          ...currentForm,
          date: parsed.fields.date || currentForm.date,
          startTime: nextStartTime,
          endTime: nextEndTime,
          hours: nextHours || currentForm.hours,
          sales:
            parsed.fields.sales != null ? String(parsed.fields.sales.toFixed(2)) : currentForm.sales,
          tips:
            parsed.fields.tips != null ? String(parsed.fields.tips.toFixed(2)) : currentForm.tips,
          notes:
            parsed.fields.notes && !currentForm.notes
              ? parsed.fields.notes
              : currentForm.notes,
        };
      });
    } catch (error) {
      setScanError(error.message || 'Unable to read this receipt.');
    } finally {
      setIsScanning(false);
    }
  }

  async function handleReceiptUpload(event) {
    const [file] = event.target.files || [];
    await processReceiptFile(file);
    event.target.value = '';
  }

  function handleReceiptDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingReceipt(true);
  }

  function handleReceiptDragLeave(event) {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDraggingReceipt(false);
    }
  }

  async function handleReceiptDrop(event) {
    event.preventDefault();
    setIsDraggingReceipt(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    await processReceiptFile(file);
  }

  function handleSave() {
    if (!form.date || !form.hours || !form.tips) {
      return;
    }

    onSave({
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      hours: Number(form.hours) || 0,
      sales: Number(form.sales) || 0,
      tips: Number(form.tips) || 0,
      earnings: Number(form.earnings) || 0,
      floor: form.floor,
      notes: form.notes.trim(),
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg="#151f30">
        <ModalHeader>{editingShift ? 'Edit shift' : 'Add shift'}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleReceiptUpload}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleReceiptUpload}
            />

            <Box
              w="full"
              p={4}
              borderRadius="xl"
              border="1px solid"
              borderColor={isDraggingReceipt ? 'purple.300' : 'whiteAlpha.200'}
              bg={isDraggingReceipt ? 'purple.900' : 'whiteAlpha.50'}
              transition="all 0.2s ease"
              onDragOver={handleReceiptDragOver}
              onDragLeave={handleReceiptDragLeave}
              onDrop={handleReceiptDrop}
            >
              <HStack justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexDir={{ base: 'column', md: 'row' }} spacing={3}>
                <Box>
                  <Text fontWeight="semibold">Scan a shift receipt</Text>
                  <Text fontSize="sm" color="gray.400" mt={1}>
                    Take a new photo, upload one from your phone, or drag a receipt image here and
                    I&apos;ll try to pull in the date, time, sales, and credit tips for you.
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    Receipt scans assume a `5:00 PM` start time and use the top receipt time as
                    your clock-out time.
                  </Text>
                  <Text fontSize="xs" color={isDraggingReceipt ? 'purple.100' : 'gray.500'} mt={2}>
                    {isDraggingReceipt
                      ? 'Drop the receipt image to scan it now.'
                      : 'Desktop tip: drag and drop a receipt photo right into this box.'}
                  </Text>
                </Box>
                <HStack spacing={2} flexWrap="wrap">
                  <Button
                    leftIcon={<Camera size={16} />}
                    onClick={() => cameraInputRef.current?.click()}
                    isLoading={isScanning}
                    loadingText="Scanning"
                    colorScheme="purple"
                    variant="outline"
                  >
                    Take Photo
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    isDisabled={isScanning}
                    variant="outline"
                    borderColor="whiteAlpha.300"
                  >
                    Upload Photo
                  </Button>
                </HStack>
              </HStack>

              {isScanning ? (
                <Box mt={4}>
                  <Text fontSize="sm" color="gray.300" mb={2}>
                    {scanStatus || 'Reading receipt...'}
                  </Text>
                  <Progress value={scanProgress} size="sm" rounded="full" colorScheme="purple" />
                </Box>
              ) : null}

              {scanError ? (
                <Alert status="warning" mt={4} borderRadius="lg" bg="orange.900" color="orange.100">
                  <AlertIcon />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
              ) : null}

              {scanSummary.length ? (
                <Alert status="success" mt={4} borderRadius="lg" bg="green.900" color="green.100">
                  <AlertIcon />
                  <Box>
                    <AlertTitle mb={1}>Receipt scanned</AlertTitle>
                    <AlertDescription>
                      {scanSummary.map((item) => `${item.label}: ${item.value}`).join(' • ')}
                    </AlertDescription>
                  </Box>
                </Alert>
              ) : null}
            </Box>

            <FormControl isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
              />
            </FormControl>

            <HStack w="full" spacing={4}>
              <FormControl>
                <FormLabel>Start time</FormLabel>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateField('startTime', event.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>End time</FormLabel>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => updateField('endTime', event.target.value)}
                />
              </FormControl>
            </HStack>

            <HStack w="full" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Hours</FormLabel>
                <NumberInput
                  min={0}
                  max={24}
                  precision={2}
                  value={form.hours}
                  onChange={(value) => updateField('hours', value)}
                >
                  <NumberInputField placeholder="6.50" />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tips</FormLabel>
                <NumberInput
                  min={0}
                  precision={2}
                  value={form.tips}
                  onChange={(value) => updateField('tips', value)}
                >
                  <NumberInputField placeholder="0.00" />
                </NumberInput>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel>Sales</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                value={form.sales}
                onChange={(value) => updateField('sales', value)}
              >
                <NumberInputField placeholder="0.00" />
              </NumberInput>
              <FormHelperText color="gray.400">
                Tip-out is automatically calculated as {settings?.tipOutRate || 0}% of sales.
                Estimated deduction: {formatCurrency(estimatedTipOut)}
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Base pay</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                value={form.earnings}
                onChange={(value) => updateField('earnings', value)}
              >
                <NumberInputField placeholder="Leave blank to use hourly rate" />
              </NumberInput>
              <FormHelperText color="gray.400">
                Suggested from settings: {formatCurrency(suggestedBasePay)}
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Floor</FormLabel>
              <Select
                placeholder="Select floor"
                value={form.floor}
                onChange={(event) => updateField('floor', event.target.value)}
              >
                {FLOORS.map((floor) => (
                  <option key={floor} value={floor}>
                    {floor}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                rows={3}
                placeholder="Anything worth remembering about this shift?"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="teal"
            onClick={handleSave}
            isDisabled={!form.date || !form.hours || !form.tips}
          >
            {editingShift ? 'Save changes' : 'Add shift'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AddShiftDialog;
