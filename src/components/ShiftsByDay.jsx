import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { Edit, Trash2 } from 'lucide-react';

function ShiftsByDay({
  isDarkMode = false,
  shifts,
  settings,
  onEdit,
  onDelete,
  title = 'All shifts',
  badgeLabel,
  emptyTitle = 'No shifts logged yet.',
  emptySubtitle = 'Add a shift to get started.',
}) {
  const sortedShifts = [...(shifts || [])].sort((left, right) => {
    return new Date(right.date) - new Date(left.date);
  });

  if (!sortedShifts.length) {
    return (
      <Box
        textAlign="center"
        py={12}
        px={6}
        bg={isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.9)'}
        borderRadius="3xl"
        border="1px solid"
        borderColor="rgba(22, 33, 43, 0.06)"
      >
        <Text fontSize="lg" fontWeight="semibold">
          {emptyTitle}
        </Text>
        <Text mt={2} color="gray.700">
          {emptySubtitle}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg={isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.9)'}
      borderRadius="3xl"
      border="1px solid"
      borderColor="rgba(22, 33, 43, 0.06)"
      overflow="hidden"
      boxShadow="0 18px 36px rgba(34, 46, 56, 0.06)"
    >
      <Flex
        px={5}
        py={4}
        borderBottom="1px solid"
        borderColor="rgba(22, 33, 43, 0.06)"
        align="center"
        justify="space-between"
        gap={3}
      >
        <Heading size="sm" letterSpacing="-0.02em" color={isDarkMode ? 'white' : '#18222c'}>{title}</Heading>
        <Badge bg="rgba(59, 130, 246, 0.1)" color="brand.700" borderRadius="full" px={3} py={1}>
          {badgeLabel || `${sortedShifts.length} ${sortedShifts.length === 1 ? 'shift' : 'shifts'}`}
        </Badge>
      </Flex>

      <Box overflowX="auto">
        <Table size="sm">
          <Thead bg="rgba(22, 33, 43, 0.03)">
            <Tr>
              <Th color="gray.400">Date</Th>
              <Th color="gray.400">Shift</Th>
              <Th color="gray.400">Hours</Th>
              <Th color="gray.400">Sales</Th>
              <Th color="gray.400">Gross Tips</Th>
              <Th color="gray.400">Tip-Out</Th>
              <Th color="gray.400">Net Tips</Th>
              <Th color="gray.400">Base Pay</Th>
              <Th color="gray.400">Floor</Th>
              <Th color="gray.400">Notes</Th>
              <Th color="gray.400">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedShifts.map((shift) => {
              const hours = Number(shift.hours) || 0;
              const sales = Number(shift.sales) || 0;
              const tips = Number(shift.tips) || 0;
              const tipOut = sales * ((Number(settings?.tipOutRate) || 0) / 100);
              const netTips = tips - tipOut;
              const basePay = Number(shift.earnings) || 0;

              return (
                <Tr key={shift.id} _hover={{ bg: 'rgba(22, 33, 43, 0.03)' }}>
                  <Td fontWeight="semibold">{shift.date}</Td>
                  <Td color={isDarkMode ? 'gray.200' : 'gray.800'}>
                    {shift.startTime && shift.endTime
                      ? `${shift.startTime} - ${shift.endTime}`
                      : 'Manual entry'}
                  </Td>
                  <Td>{hours.toFixed(2)}</Td>
                  <Td color="orange.200">${sales.toFixed(2)}</Td>
                  <Td color="green.600">${tips.toFixed(2)}</Td>
                  <Td color="red.300">${tipOut.toFixed(2)}</Td>
                  <Td color="brand.700">${netTips.toFixed(2)}</Td>
                  <Td color="blue.300">
                    {basePay > 0 ? `$${basePay.toFixed(2)}` : 'From hourly rate'}
                  </Td>
                  <Td>{shift.floor || 'Unspecified'}</Td>
                  <Td maxW="220px">
                    <Text color="gray.400" noOfLines={1}>
                      {shift.notes || 'No notes'}
                    </Text>
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton
                        icon={<Edit size={14} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="gray"
                        aria-label="Edit shift"
                        onClick={() => onEdit?.(shift)}
                      />
                      <IconButton
                        icon={<Trash2 size={14} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Delete shift"
                        onClick={() => onDelete?.(shift.id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default ShiftsByDay;
