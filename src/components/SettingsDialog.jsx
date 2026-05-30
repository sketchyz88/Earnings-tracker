import { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
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
  Text,
  VStack,
} from '@chakra-ui/react';
import { DEFAULT_PAY_PERIOD_SETTINGS } from './BiWeeklyHours';

function SettingsDialog({ isDarkMode = false, isOpen, onClose, onSave, settings }) {
  const [form, setForm] = useState({
    hourlyRate: 15,
    tipOutRate: 4.5,
    tipGoal: 100,
    hoursGoal: 80,
    payPeriodLengthDays: DEFAULT_PAY_PERIOD_SETTINGS.payPeriodLengthDays,
    payPeriodAnchorDate: DEFAULT_PAY_PERIOD_SETTINGS.payPeriodAnchorDate,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        hourlyRate: settings.hourlyRate || 15,
        tipOutRate: settings.tipOutRate || 4.5,
        tipGoal: settings.tipGoal || 100,
        hoursGoal: settings.hoursGoal || 80,
        payPeriodLengthDays:
          Number(settings.payPeriodLengthDays) || DEFAULT_PAY_PERIOD_SETTINGS.payPeriodLengthDays,
        payPeriodAnchorDate:
          settings.payPeriodAnchorDate || DEFAULT_PAY_PERIOD_SETTINGS.payPeriodAnchorDate,
      });
    }
  }, [settings, isOpen]);

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalOverlay />
      <ModalContent
        bg={isDarkMode ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)'}
        border={`1px solid ${isDarkMode ? 'rgba(148, 163, 184, 0.14)' : 'rgba(22, 33, 43, 0.08)'}`}
        borderRadius="3xl"
      >
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Hourly Rate ($)</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                value={form.hourlyRate}
                onChange={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    hourlyRate: parseFloat(value) || 0,
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
              <Text fontSize="xs" color="gray.500">
                Used to estimate base pay.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Tip-Out Rate (%)</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                value={form.tipOutRate}
                onChange={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    tipOutRate: parseFloat(value) || 0,
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
              <Text fontSize="xs" color="gray.500">
                Tip-out is deducted from tips using this percentage of sales.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Pay Period Net Tip Goal ($)</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                value={form.tipGoal}
                onChange={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    tipGoal: parseFloat(value) || 0,
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
              <Text fontSize="xs" color="gray.500">
                Track your goal after tip-out is deducted.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Pay Period Hours Goal</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                value={form.hoursGoal}
                onChange={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    hoursGoal: parseFloat(value) || 0,
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
              <Text fontSize="xs" color="gray.500">
                Your target hours per pay period.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Pay Period Length (days)</FormLabel>
              <NumberInput
                min={1}
                precision={0}
                value={form.payPeriodLengthDays}
                onChange={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    payPeriodLengthDays: Math.max(1, parseInt(value, 10) || 1),
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
              <Text fontSize="xs" color="gray.500">
                The app uses this many days in each repeating pay period.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Pay Period Start Date</FormLabel>
              <Input
                type="date"
                value={form.payPeriodAnchorDate}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    payPeriodAnchorDate: event.target.value,
                  }))
                }
              />
              <Text fontSize="xs" color="gray.500">
                This date becomes day one for the repeating pay-period cycle.
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button bg="brand.600" color="white" _hover={{ bg: 'brand.700' }} onClick={handleSave}>
            Save Settings
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SettingsDialog;
