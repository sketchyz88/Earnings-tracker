import { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
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
  Text,
  VStack,
} from '@chakra-ui/react';
import { DEFAULT_PAY_PERIOD_SETTINGS } from './BiWeeklyHours';

function createNewJob(index) {
  return {
    id: crypto.randomUUID(),
    name: `Job ${index + 1}`,
  };
}

function SettingsDialog({ isDarkMode = false, isOpen, onClose, onSave, settings }) {
  const [form, setForm] = useState({
    hourlyRate: 15,
    tipOutRate: 4.5,
    tipGoal: 100,
    hoursGoal: 80,
    payPeriodLengthDays: DEFAULT_PAY_PERIOD_SETTINGS.payPeriodLengthDays,
    payPeriodAnchorDate: DEFAULT_PAY_PERIOD_SETTINGS.payPeriodAnchorDate,
    jobs: [createNewJob(0)],
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
        jobs:
          Array.isArray(settings.jobs) && settings.jobs.length
            ? settings.jobs.map((job) => ({
                id: job.id || crypto.randomUUID(),
                name: job.name || '',
              }))
            : [createNewJob(0)],
      });
    }
  }, [settings, isOpen]);

  function handleSave() {
    onSave({
      ...form,
      jobs: form.jobs
        .map((job, index) => ({
          id: job.id || crypto.randomUUID(),
          name: job.name.trim() || `Job ${index + 1}`,
        }))
        .filter((job, index, jobs) => jobs.findIndex((candidate) => candidate.id === job.id) === index),
    });
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
              <FormLabel>Jobs</FormLabel>
              <VStack spacing={3} align="stretch">
                {form.jobs.map((job, index) => (
                  <HStack key={job.id} align="flex-end">
                    <FormControl>
                      <Input
                        value={job.name}
                        placeholder={`Job ${index + 1}`}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            jobs: currentForm.jobs.map((currentJob) =>
                              currentJob.id === job.id
                                ? { ...currentJob, name: event.target.value }
                                : currentJob
                            ),
                          }))
                        }
                      />
                    </FormControl>
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          jobs:
                            currentForm.jobs.length > 1
                              ? currentForm.jobs.filter((currentJob) => currentJob.id !== job.id)
                              : currentForm.jobs,
                        }))
                      }
                      isDisabled={form.jobs.length <= 1}
                    >
                      Remove
                    </Button>
                  </HStack>
                ))}
                <Button
                  alignSelf="flex-start"
                  variant="outline"
                  onClick={() =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      jobs: [...currentForm.jobs, createNewJob(currentForm.jobs.length)],
                    }))
                  }
                >
                  Add Job
                </Button>
              </VStack>
              <Text fontSize="xs" color="gray.500">
                Use jobs to keep multiple serving workplaces in one account.
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
