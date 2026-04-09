import { useState } from 'react';
import { Dialog, Portal, Field, Input, Button, Stack, CloseButton, Text, Box } from '@chakra-ui/react';
import { DollarSign } from 'lucide-react';

const SettingsDialog = ({ open, onOpenChange, currentWage, onWageUpdate }) => {
  const [wage, setWage] = useState(currentWage?.toString() || '17.80');
  const [error, setError] = useState('');

  const handleSave = () => {
    const wageNum = parseFloat(wage);
    
    if (isNaN(wageNum) || wageNum <= 0) {
      setError('Please enter a valid wage greater than $0');
      return;
    }

    if (wageNum > 100) {
      setError('Wage must be less than $100/hour');
      return;
    }

    onWageUpdate(wageNum);
    onOpenChange(false);
    setError('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => {
      onOpenChange(e.open);
      if (!e.open) setError('');
    }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.800" borderColor="gray.700">
            <Dialog.Header>
              <Dialog.Title color="whiteAlpha.900">Settings</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Field.Root invalid={!!error}>
                  <Field.Label color="gray.300">Hourly Wage</Field.Label>
                  <Box position="relative">
                    <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" zIndex="1">
                      <DollarSign size={18} color="var(--chakra-colors-gray-400)" />
                    </Box>
                    <Input
                      type="number"
                      placeholder="17.80"
                      step="0.01"
                      min="0"
                      value={wage}
                      onChange={(e) => {
                        setWage(e.target.value);
                        setError('');
                      }}
                      pl="10"
                      bg="gray.700"
                      borderColor="gray.600"
                      color="whiteAlpha.900"
                      _placeholder={{ color: "gray.500" }}
                    />
                  </Box>
                  {error && <Field.ErrorText color="red.400">{error}</Field.ErrorText>}
                  <Field.HelperText color="gray.400">
                    This will be used to calculate your estimated wages for each pay period
                  </Field.HelperText>
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="blue" onClick={handleSave}>
                Save Settings
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

export default SettingsDialog;
