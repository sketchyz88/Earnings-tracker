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

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Your phone photo could not be opened in the browser. Try choosing a JPG or PNG image from Photos.'
        )
      );
    };

    image.src = objectUrl;
  });
}

async function prepareReceiptImage(file) {
  if (!file?.type?.startsWith('image/')) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const processedBlob = await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });

  if (!processedBlob) {
    return file;
  }

  return new File([processedBlob], file.name.replace(/\.[^.]+$/, '') || 'receipt-scan', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

function shiftDateBackOneDay(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function didShiftCrossMidnight(startTime, endTime) {
  if (!startTime || !endTime) {
    return false;
  }

  return endTime < startTime;
}

function getReceiptFingerprint(shift) {
  return [
    shift.date || 'missing-date',
    shift.endTime || 'missing-time',
    Number(shift.sales || 0).toFixed(2),
    Number(shift.tips || 0).toFixed(2),
  ].join('|');
}

function createShiftFromParsedReceipt(parsed, fallbackForm = createEmptyForm()) {
  const fallbackDate =
    fallbackForm.date && fallbackForm.date !== today() ? fallbackForm.date : '';
  const startTime = fallbackForm.startTime || '17:00';
  const endTime = parsed.fields.endTime || '';
  const scannedDate = parsed.fields.date || fallbackDate;
  const adjustedDate =
    scannedDate && didShiftCrossMidnight(startTime, endTime)
      ? shiftDateBackOneDay(scannedDate)
      : scannedDate;
  const hours = endTime ? calculateHours(startTime, endTime) : '';
  const issues = [];

  if (!parsed.fields.date) {
    issues.push('Missing date');
  }

  if (!parsed.fields.endTime) {
    issues.push('Missing clock-out time');
  }

  if (!hours) {
    issues.push('Hours need review');
  }

  return {
    date: adjustedDate,
    startTime,
    endTime,
    hours,
    sales: parsed.fields.sales != null ? String(parsed.fields.sales.toFixed(2)) : fallbackForm.sales,
    tips: parsed.fields.tips != null ? String(parsed.fields.tips.toFixed(2)) : fallbackForm.tips,
    earnings: fallbackForm.earnings || '',
    floor: fallbackForm.floor || '',
    notes: parsed.fields.notes || fallbackForm.notes || '',
    issues,
  };
}

function AddShiftDialog({
  isOpen,
  onClose,
  onSave,
  onSaveBatch,
  editingShift,
  settings,
  existingShifts = [],
}) {
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
      setScanStatus('Preparing image');
      const preparedFile = await prepareReceiptImage(file);
      const { default: Tesseract } = await import('tesseract.js');
      const result = await Tesseract.recognize(preparedFile, 'eng', {
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

      const shift = {
        id: crypto.randomUUID(),
        fileName: file.name,
        summary: parsed.summary,
        shift: draft,
      };

      const duplicateFingerprint = getReceiptFingerprint(draft);
      shift.isDuplicate = existingShifts.some(
        (existingShift) => getReceiptFingerprint(existingShift) === duplicateFingerprint
      );

      return shift;
    } catch (error) {
      setScanError(
        error.message ||
          'Unable to read this receipt. On a phone, try uploading a JPG or PNG image from your photo library.'
      );
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
      const knownFingerprints = new Set([
        ...existingShifts.map(getReceiptFingerprint),
        ...batchDrafts.map((draft) => getReceiptFingerprint(draft.shift)),
      ]);
      const nextDrafts = [];
      for (const file of files) {
        const result = await processReceiptFile(file, { preserveCurrentForm: true });
        if (result) {
          const fingerprint = getReceiptFingerprint(result.shift);
          if (knownFingerprints.has(fingerprint)) {
            result.isDuplicate = true;
          }
          knownFingerprints.add(fingerprint);
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

    const knownFingerprints = new Set([
      ...existingShifts.map(getReceiptFingerprint),
      ...batchDrafts.map((draft) => getReceiptFingerprint(draft.shift)),
    ]);
    const nextDrafts = [];
    for (const file of files) {
      const result = await processReceiptFile(file, { preserveCurrentForm: true });
      if (result) {
        const fingerprint = getReceiptFingerprint(result.shift);
        if (knownFingerprints.has(fingerprint)) {
          result.isDuplicate = true;
        }
        knownFingerprints.add(fingerprint);
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

  async function handleSaveBatchDrafts() {
    if (!batchDrafts.length || !onSaveBatch) {
      return;
    }

    const draftsToSave = batchDrafts.filter((draft) => !draft.isDuplicate);
    if (!draftsToSave.length) {
      setScanError('Every scanned receipt in this batch looks like a duplicate of an existing shift.');
      return;
    }

    const saved = await onSaveBatch(
      draftsToSave.map((draft) => ({
        ...draft.shift,
        hours: Number(draft.shift.hours) || 0,
        sales: Number(draft.shift.sales) || 0,
        tips: Number(draft.shift.tips) || 0,
        earnings: Number(draft.shift.earnings) || 0,
      }))
    );

    if (saved) {
      setBatchDrafts([]);
    }
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
      <ModalContent
        bg="rgba(255, 255, 255, 0.96)"
        border="1px solid rgba(22, 33, 43, 0.08)"
        borderRadius="3xl"
      >
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
              borderRadius="2xl"
              border="1px solid"
              borderColor={isDraggingReceipt ? 'brand.300' : 'rgba(22, 33, 43, 0.1)'}
              bg={isDraggingReceipt ? 'rgba(59, 130, 246, 0.08)' : 'rgba(22, 33, 43, 0.02)'}
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
                  <Text fontSize="xs" color={isDraggingReceipt ? 'green.100' : 'gray.500'} mt={2}>
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
                    bg="brand.600"
                    color="white"
                    _hover={{ bg: 'brand.700' }}
                  >
                    Take Photo
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    isDisabled={isScanning}
                    variant="outline"
                    borderColor="rgba(22, 33, 43, 0.12)"
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
                  <Progress value={scanProgress} size="sm" rounded="full" colorScheme="green" />
                </Box>
              ) : null}

              {scanError ? (
                <Alert status="warning" mt={4} borderRadius="xl" bg="orange.900" color="orange.100">
                  <AlertIcon />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
              ) : null}

              {scanSummary.length ? (
                <Alert status="success" mt={4} borderRadius="xl" bg="green.900" color="green.100">
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
                    <Button bg="brand.600" color="white" _hover={{ bg: 'brand.700' }} onClick={handleSaveBatchDrafts}>
                      Add All Scanned Shifts
                    </Button>
                  </HStack>

                  {batchDrafts.map((draft) => (
                    <Box
                      key={draft.id}
                      p={3}
                      borderRadius="2xl"
                      bg="rgba(22, 33, 43, 0.03)"
                      border="1px solid"
                      borderColor="rgba(22, 33, 43, 0.08)"
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
                            {draft.isDuplicate ? <Badge colorScheme="red">Possible duplicate</Badge> : null}
                            {draft.shift.issues?.length ? (
                              <Badge colorScheme="yellow">Needs review</Badge>
                            ) : null}
                          </HStack>
                          <Text mt={2} fontSize="sm" color="gray.300">
                            Sales {formatCurrency(Number(draft.shift.sales) || 0)} • Tips{' '}
                            {formatCurrency(Number(draft.shift.tips) || 0)}
                          </Text>
                          {draft.shift.issues?.length ? (
                            <Text mt={1} fontSize="xs" color="yellow.200">
                              {draft.shift.issues.join(' • ')}
                            </Text>
                          ) : null}
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
