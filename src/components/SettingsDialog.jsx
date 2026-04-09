import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, NumberInput, NumberInputField, VStack, Text,
} from '@chakra-ui/react';
const ce = React.createElement;

const SettingsDialog = ({ isOpen, onClose, onSave, settings }) => {
  const [form, setForm] = useState({ hourlyRate: 15, tipGoal: 100, hoursGoal: 80 });

  useEffect(() => {
    if (settings) setForm({
      hourlyRate: settings.hourlyRate || 15,
      tipGoal: settings.tipGoal || 100,
      hoursGoal: settings.hoursGoal || 80,
    });
  }, [settings, isOpen]);

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return ce(Modal, { isOpen, onClose, size: 'sm' },
    ce(ModalOverlay, null),
    ce(ModalContent, null,
      ce(ModalHeader, null, 'Settings'),
      ce(ModalCloseButton, null),
      ce(ModalBody, null,
        ce(VStack, { spacing: 4 },
          ce(FormControl, null,
            ce(FormLabel, null, 'Hourly Rate ($)'),
            ce(NumberInput, {
              min: 0,
              value: form.hourlyRate,
              onChange: v => setForm(f => ({ ...f, hourlyRate: parseFloat(v) || 0 })),
            },
              ce(NumberInputField, null)
            ),
            ce(Text, { fontSize: 'xs', color: 'gray.500' }, 'Used to estimate base pay')
          ),
          ce(FormControl, null,
            ce(FormLabel, null, 'Bi-Weekly Tip Goal ($)'),
            ce(NumberInput, {
              min: 0,
              value: form.tipGoal,
              onChange: v => setForm(f => ({ ...f, tipGoal: parseFloat(v) || 0 })),
            },
              ce(NumberInputField, null)
            ),
            ce(Text, { fontSize: 'xs', color: 'gray.500' }, 'Your target tips per pay period')
          ),
          ce(FormControl, null,
            ce(FormLabel, null, 'Bi-Weekly Hours Goal'),
            ce(NumberInput, {
              min: 0,
              value: form.hoursGoal,
              onChange: v => setForm(f => ({ ...f, hoursGoal: parseFloat(v) || 0 })),
            },
              ce(NumberInputField, null)
            ),
            ce(Text, { fontSize: 'xs', color: 'gray.500' }, 'Your target hours per pay period')
          )
        )
      ),
      ce(ModalFooter, null,
        ce(Button, { variant: 'ghost', mr: 3, onClick: onClose }, 'Cancel'),
        ce(Button, { colorScheme: 'teal', onClick: handleSave }, 'Save Settings')
      )
    )
  );
};

export default SettingsDialog;
