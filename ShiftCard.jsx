import { useState } from 'react';
import { Card, HStack, VStack, Text, Badge, IconButton, SimpleGrid, Box, Stack, Dialog, Portal, Button, CloseButton } from '@chakra-ui/react';
import { Trash2, Clock, Users, User, Receipt, MapPin, Edit2, AlertTriangle } from 'lucide-react';

const ShiftCard = ({ shift, onDelete, onEdit }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const shiftTypeColor = {
    'Dinner': 'orange',
    'Brunch': 'purple',
    'Lunch': 'blue'
  }[shift.shiftType] || 'gray';

  const tipPerHour = shift.tips && shift.hoursWorked && shift.hoursWorked > 0
    ? shift.tips / shift.hoursWorked
    : 0;

  return (
    <Card.Root
      bg="gray.800"
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
      borderColor="gray.700"
      transition="all 0.2s"
      _hover={{ shadow: 'md', transform: 'translateY(-2px)', borderColor: 'gray.600' }}
    >
      <Card.Body p={4}>
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={2} flex={1}>
            <HStack gap={2}>
              <Badge colorPalette={shiftTypeColor} size="sm">{shift.shiftType}</Badge>
              <HStack gap={1}>
                <MapPin size={14} color="var(--chakra-colors-gray-400)" />
                <Badge colorPalette="gray" size="sm" variant="subtle">{shift.section}</Badge>
              </HStack>
            </HStack>
            <Text fontSize="sm" color="gray.400">
              {shift.shiftDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </VStack>

          <HStack gap={1}>
            <IconButton
              size="sm"
              variant="ghost"
              colorPalette="blue"
              aria-label="Edit shift"
              onClick={() => onEdit(shift)}
            >
              <Edit2 size={16} />
            </IconButton>
            <IconButton
              size="sm"
              variant="ghost"
              colorPalette="red"
              aria-label="Delete shift"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 size={16} />
            </IconButton>
          </HStack>
        </HStack>

        <Dialog.Root open={deleteConfirmOpen} onOpenChange={(e) => setDeleteConfirmOpen(e.open)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content bg="gray.800" borderColor="gray.700">
                <Dialog.Header>
                  <Dialog.Title color="whiteAlpha.900">Delete Shift</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack gap={4} align="start">
                    <HStack gap={3}>
                      <AlertTriangle size={24} color="var(--chakra-colors-red-400)" />
                      <Text color="gray.300">Are you sure you want to delete this shift?</Text>
                    </HStack>
                    <Box bg="gray.750" p={3} borderRadius="md" w="full">
                      <VStack align="start" gap={1}>
                        <Text fontSize="sm" color="gray.400">
                          {shift.shiftDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <Text fontSize="sm" fontWeight="600" color="whiteAlpha.900">
                          ${shift.tips?.toFixed(2) || '0.00'} • {shift.hoursWorked?.toFixed(1) || 0}h
                        </Text>
                      </VStack>
                    </Box>
                    <Text fontSize="sm" color="red.300">This action cannot be undone.</Text>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </Dialog.ActionTrigger>
                  <Button 
                    colorPalette="red" 
                    onClick={() => {
                      onDelete(shift.id);
                      setDeleteConfirmOpen(false);
                    }}
                  >
                    Delete Shift
                  </Button>
                </Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mt={4}>
          <VStack align="start" gap={1}>
            <HStack gap={1}>
              <Clock size={14} color="var(--chakra-colors-gray-400)" />
              <Text fontSize="xs" color="gray.400">Hours</Text>
            </HStack>
            <Text fontSize="md" fontWeight="600" color="whiteAlpha.900">{shift.hoursWorked?.toFixed(1) || 0}h</Text>
          </VStack>

          <VStack align="start" gap={1}>
            <HStack gap={1}>
              <Users size={14} color="var(--chakra-colors-gray-400)" />
              <Text fontSize="xs" color="gray.400">Tables</Text>
            </HStack>
            <Text fontSize="md" fontWeight="600" color="whiteAlpha.900">{shift.tablesServed || 0}</Text>
          </VStack>

          <VStack align="start" gap={1}>
            <HStack gap={1}>
              <User size={14} color="var(--chakra-colors-gray-400)" />
              <Text fontSize="xs" color="gray.400">Guests</Text>
            </HStack>
            <Text fontSize="md" fontWeight="600" color="whiteAlpha.900">{shift.guests || 0}</Text>
          </VStack>

          <VStack align="start" gap={1}>
            <HStack gap={1}>
              <Receipt size={14} color="var(--chakra-colors-gray-400)" />
              <Text fontSize="xs" color="gray.400">Tabs</Text>
            </HStack>
            <Text fontSize="md" fontWeight="600" color="whiteAlpha.900">{shift.tabs || 0}</Text>
          </VStack>
        </SimpleGrid>

        <Box mt={4} pt={4} borderTopWidth="1px" borderColor="gray.700">
          <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'start', md: 'flex-end' }} mb={3} gap={3}>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="gray.400">Tips Earned (Gross)</Text>
              <Text fontSize="2xl" fontWeight="700" color="green.400">${shift.tips?.toFixed(2) || '0.00'}</Text>
            </VStack>
            <VStack align="end" gap={0}>
              <Text fontSize="xs" color="gray.400">Per Hour</Text>
              <Text fontSize="lg" fontWeight="600" color="whiteAlpha.900">
                ${tipPerHour.toFixed(2)}
              </Text>
            </VStack>
          </Stack>

          {shift.totalSales > 0 && (
            <Box mt={3} p={2} bg="orange.900" borderRadius="md" borderWidth="1px" borderColor="orange.700" mb={3}>
              <HStack justify="space-between" fontSize="sm">
                <Text color="orange.200">4% Tip Out:</Text>
                <Text fontWeight="600" color="orange.300">-${(shift.totalSales * 0.04).toFixed(2)}</Text>
              </HStack>
            </Box>
          )}

          {shift.totalSales > 0 && (
            <Box p={3} bg="blue.900" borderRadius="md" borderWidth="1px" borderColor="blue.700">
              <HStack justify="space-between">
                <Text fontSize="sm" color="blue.200">Net Take-Home:</Text>
                <Text fontSize="xl" fontWeight="700" color="blue.300">
                  ${((shift.tips || 0) - (shift.totalSales * 0.04)).toFixed(2)}
                </Text>
              </HStack>
            </Box>
          )}
        </Box>
      </Card.Body>
    </Card.Root>
  );
};

export default ShiftCard;
