import { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
    Button, FormControl, FormLabel, NumberInput, NumberInputField, VStack, Text,
} from '@chakra-ui/react';

const SettingsDialog = ({ isOpen, onClose, onSave, settings }) => {
    const [form, setForm] = useState({ hourlyRate: 15, tipGoal: 100, hoursGoal: 80 });

    useEffect(() => {
          if (settings) setForm({ hourlyRate: settings.hourlyRate || 15, tipGoal: settings.tipGoal || 100, hoursGoal: settings.hoursGoal || 80 });
    }, [settings, isOpen]);

    return (
          <Modal isOpen={isOpen} onClose={onClose} size="sm">
                <ModalOverlay />
                <ModalContent>
                        <ModalHeader>Settings</ModalHeader>ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                                  <VStack spacing={4}>
                                              <FormControl>
                                                            <FormLabel>Hourly Rate ($)</FormLabel>FormLabel>
                                                            <NumberInput min={0} value={form.hourlyRate} onChange={v => setForm(f => ({ ...f, hourlyRate: parseFloat(v) || 0 }))}>
                                                                            <NumberInputField />
                                                            </NumberInput>NumberInput>
                                                            <Text fontSize="xs" color="gray.500">Used to estimate base pay</Text>Text>
                                              </FormControl>FormControl>
                                              <FormControl>
                                                            <FormLabel>Tip Goal ($ per shift)</FormLabel>FormLabel>
                                                            <NumberInput min={0} value={form.tipGoal} onChange={v => setForm(f => ({ ...f, tipGoal: parseFloat(v) || 0 }))}>
                                                                            <NumberInputField />
                                                            </NumberInput>NumberInput>
                                              </FormControl>FormControl>
                                              <FormControl>
                                                            <FormLabel>Bi-Weekly Hours Goal</FormLabel>FormLabel>
                                                            <NumberInput min={0} value={form.hoursGoal} onChange={v => setForm(f => ({ ...f, hoursGoal: parseFloat(v) || 0 }))}>
                                                                            <NumberInputField />
                                                            </NumberInput>NumberInput>
                                              </FormControl>FormControl>
                                  </VStack>VStack>
                        </ModalBody>ModalBody>
                        <ModalFooter>
                                  <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>Button>
                                  <Button colorScheme="teal" onClick={() => onSave(form)}>Save Settings</Button>Button>
                        </ModalFooter>ModalFooter>
                </ModalContent>ModalContent>
          </Modal>Modal>
        );
};

export default SettingsDialog;</Modal>
