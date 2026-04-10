import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
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

function createShiftFromParsedReceipt(parsed, fallbackForm = createEmptyForm()) {
  const startTime = fallbackForm.startTime || '17:00';
  const endTime = parsed.fields.endTime || fallbackForm.endTime || '';
  const hours = calculateHours(startTime, endTime) || fallbackForm.hours || '';

  return {
    date: parsed.fields.date || fallbackForm.date,
    startTime,
    endTime,
    hours,
    sales: parsed.fields.sales != null ? String(parsed.fields.sales.toFixed(2)) : fallbackForm.sales,
    tips: parsed.fields.tips != null ? String(parsed.fields.tips.toFixed(2)) : fallbackForm.tips,
    earnings: fallbackForm.earnings || '',
    floor: fallbackForm.floor || '',
    notes: parsed.fields.notes || fallbackForm.notes || '',
  };
}

function AddShiftDialog({ isOpen, onClose, onSave, onSaveBatch, editingShift, settings }) {
  const [form, setForm] = useState(createEmptyForm);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSummary, setScanSummary] = useState([]);
  const [batchDrafts, setBatchDrafts] = useState([]);
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
      setBatchDrafts([]);
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

  async function processReceiptFile(file, options = {}) {
    const { preserveCurrentForm = false } = options;

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

      const draft = createShiftFromParsedReceipt(parsed, preserveCurrentForm ? createEmptyForm() : form);

      setScanSummary(parsed.summary);
      if (!preserveCurrentForm) {
        setForm(draft);
      }

      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        summary: parsed.summary,
        shift: draft,
      };
    } catch (error) {
      setScanError(error.message || 'Unable to read this receipt.');
      return null;
    } finally {
      setIsScanning(false);
    }
  }

  async function handleReceiptUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    if (files.length === 1) {
      await processReceiptFile(files[0]);
    } else {
      const nextDrafts = [];
      for (const file of files) {
        const result = await processReceiptFile(file, { preserveCurrentForm: true });
        if (result) {
          nextDrafts.push(result);
        }
      }

      if (nextDrafts.length) {
        setBatchDrafts((currentDrafts) => [...currentDrafts, ...nextDrafts]);
        setScanSummary([
          { label: 'Batch Scan', value: `${nextDrafts.length} receipts ready to review` },
        ]);
      }
    }

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
    const files = Array.from(event.dataTransfer.files || []);

    if (!files.length) {
      return;
    }

    if (files.length === 1) {
      await processReceiptFile(files[0]);
      return;
    }

    const nextDrafts = [];
    for (const file of files) {
      const result = await processReceiptFile(file, { preserveCurrentForm: true });
      if (result) {
        nextDrafts.push(result);
      }
    }

    if (nextDrafts.length) {
      setBatchDrafts((currentDrafts) => [...currentDrafts, ...nextDrafts]);
      setScanSummary([
        { label: 'Batch Scan', value: `${nextDrafts.length} receipts ready to review` },
      ]);
    }
  }

  function handleUseBatchDraft(draft) {
    setForm(draft.shift);
  }

  function handleRemoveBatchDraft(draftId) {
    setBatchDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId));
  }

  function handleSaveBatchDrafts() {
    if (!batchDrafts.length || !onSaveBatch) {
      return;
    }

    onSaveBatch(
      batchDrafts.map((draft) => ({
        ...draft.shift,
        hours: Number(draft.shift.hours) || 0,
        sales: Number(draft.shift.sales) || 0,
        tips: Number(draft.shift.tips) || 0,
        earnings: Number(draft.shift.earnings) || 0,
      }))
    );

    setBatchDrafts([]);
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
              multiple
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
                      ? 'Drop one or more receipt images to scan them now.'
                      : 'Desktop tip: drag and drop one or more receipt photos right into this box.'}
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
                    Upload Photo(s)
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

              {batchDrafts.length ? (
                <Box mt={4} display="grid" gap={3}>
                  <HStack justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexDir={{ base: 'column', md: 'row' }}>
                    <Box>
                      <Text fontWeight="semibold">Batch review</Text>
                      <Text fontSize="sm" color="gray.400">
                        Review the scanned receipts below, then add them all at once.
                      </Text>
                    </Box>
                    <Button colorScheme="teal" onClick={handleSaveBatchDrafts}>
                      Add All Scanned Shifts
                    </Button>
                  </HStack>

                  {batchDrafts.map((draft) => (
                    <Box
                      key={draft.id}
                      p={3}
                      borderRadius="xl"
                      bg="whiteAlpha.100"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                    >
                      <HStack justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexDir={{ base: 'column', md: 'row' }} spacing={3}>
                        <Box>
                          <HStack spacing={2} flexWrap="wrap">
                            <Text fontWeight="semibold">{draft.fileName || 'Scanned receipt'}</Text>
                            <Badge colorScheme="purple">
                              {draft.shift.date || 'Missing date'}
                            </Badge>
                            <Badge colorScheme="blue">
                              Out {draft.shift.endTime || 'Missing time'}
                            </Badge>
                            <Badge colorScheme="orange">
                              {draft.shift.hours || '0.00'} hrs
                            </Badge>
                          </HStack>
                          <Text mt={2} fontSize="sm" color="gray.300">
                            Sales {formatCurrency(Number(draft.shift.sales) || 0)} • Tips{' '}
                            {formatCurrency(Number(draft.shift.tips) || 0)}
                          </Text>
                        </Box>
                        <HStack spacing={2}>
                          <Button size="sm" variant="outline" onClick={() => handleUseBatchDraft(draft)}>
                            Load Into Form
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveBatchDraft(draft.id)}
                          >
                            Remove
                          </Button>
                        </HStack>
                      </HStack>
                    </Box>
                  ))}
                </Box>
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
