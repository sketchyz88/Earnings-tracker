import { Box, Table, Thead, Tbody, Tr, Th, Td, Button, Text, Heading, Badge, HStack, IconButton, Flex } from '@chakra-ui/react';
import { Edit, Trash2 } from 'lucide-react';

const ShiftsByDay = ({ shifts, onEdit, onDelete }) => {
    const sorted = [...(shifts || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!sorted.length) {
          return (
                  <Box textAlign="center" py={10} color="gray.500">
                          <Text fontSize="lg">No shifts logged yet.</Text>Text>
                          <Text fontSize="sm">Click "Add Shift" to get started!</Text>Text>
                  </Box>Box>
                );
    }
  
    return (
          <Box bg="white" rounded="lg" shadow="sm" border="1px" borderColor="gray.200" overflow="hidden">
                <Flex px={4} py={3} borderBottom="1px" borderColor="gray.200" align="center" justify="space-between">
                        <Heading size="sm">All Shifts</Heading>Heading>
                        <Badge colorScheme="teal">{sorted.length} shifts</Badge>Badge>
                </Flex>Flex>
                <Box overflowX="auto">
                        <Table size="sm">
                                  <Thead bg="gray.50">
                                              <Tr>
                                                            <Th>Date</Th>Th>
                                                            <Th>Hours</Th>Th>
                                                            <Th>Tips</Th>Th>
                                                            <Th>Earnings</Th>Th>
                                                            <Th>Floor</Th>Th>
                                                            <Th>Tips/Hr</Th>Th>
                                                            <Th>Notes</Th>Th>
                                                            <Th>Actions</Th>Th>
                                              </Tr>Tr>
                                  </Thead>Thead>
                                  <Tbody>
                                    {sorted.map(shift => {
                          const tph = shift.hours > 0 ? (shift.tips / shift.hours).toFixed(2) : '0.00';
                          return (
                                            <Tr key={shift.id} _hover={{ bg: 'gray.50' }}>
                                                              <Td fontWeight="medium">{shift.date}</Td>Td>
                                                              <Td>{parseFloat(shift.hours || 0).toFixed(1)}</Td>Td>
                                                              <Td color="green.600">${parseFloat(shift.tips || 0).toFixed(2)}</Td>Td>
                                                              <Td color="blue.600">${parseFloat(shift.earnings || 0).toFixed(2)}</Td>Td>
                                                              <Td><Badge variant="outline" colorScheme="purple">{shift.floor || '—'}</Badge>Badge></Td>Td>
                                                              <Td>${tph}</Td>Td>
                                                              <Td color="gray.500" maxW="150px" isTruncated>{shift.notes || '—'}</Td>Td>
                                                              <Td>
                                                                                  <HStack>
                                                                                                        <IconButton icon={<Edit size={14} />} size="xs" variant="ghost" colorScheme="blue" aria-label="Edit" onClick={() => onEdit(shift)} />
                                                                                                        <IconButton icon={<Trash2 size={14} />} size="xs" variant="ghost" colorScheme="red" aria-label="Delete" onClick={() => onDelete(shift.id)} />
                                                                                    </HStack>HStack>
                                                              </Td>Td>
                                            </Tr>Tr>
                                          );
          })}
                                  </Tbody>Tbody>
                        </Table>Table>
                </Box>Box>
          </Box>Box>
        );
};

export default ShiftsByDay;</Box>
