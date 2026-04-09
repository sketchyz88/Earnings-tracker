import { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
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

function SettingsDialog({ isOpen, onClose, onSave, settings }) {
  const [form, setForm] = useState({
    hourlyRate: 15,
    tipOutRate: 4.5,
    tipGoal: 100,
    hoursGoal: 80,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        hourlyRate: settings.hourlyRate || 15,
        tipOutRate: settings.tipOutRate || 4.5,
        tipGoal: settings.tipGoal || 100,
        hoursGoal: settings.hoursGoal || 80,
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
      <ModalContent bg="#151f30">
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
              <FormLabel>Bi-Weekly Net Tip Goal ($)</FormLabel>
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
              <FormLabel>Bi-Weekly Hours Goal</FormLabel>
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
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="teal" onClick={handleSave}>
            Save Settings
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SettingsDialog;
