import React from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Text, Heading, Badge, HStack, IconButton, Flex } from '@chakra-ui/react';
import { Edit, Trash2 } from 'lucide-react';
const ce = React.createElement;
const ShiftsByDay = ({ shifts, onEdit, onDelete }) => {
      const sorted = [...(shifts || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      if (!sorted.length) {
              return ce(Box, {textAlign:'center',py:10,color:'gray.500'},
                              ce(Text,{fontSize:'lg'},'No shifts logged yet.'),
                              ce(Text,{fontSize:'sm'},'Click "Add Shift" to get started!')
                            );
      }
      const rows = sorted.map(shift => {
              const tph = shift.hours > 0 ? (shift.tips / shift.hours).toFixed(2) : '0.00';
              return ce(Tr, {key:shift.id, _hover:{bg:'gray.50'}},
                              ce(Td,{fontWeight:'medium'},shift.date),
                              ce(Td,null,parseFloat(shift.hours||0).toFixed(1)),
                              ce(Td,{color:'green.600'},'$'+parseFloat(shift.tips||0).toFixed(2)),
                              ce(Td,{color:'blue.600'},'$'+parseFloat(shift.earnings||0).toFixed(2)),
                              ce(Td,null,ce(Badge,{variant:'outline',colorScheme:'purple'},shift.floor||'--')),
                              ce(Td,null,'$'+tph),
                              ce(Td,{color:'gray.500',maxW:'150px',isTruncated:true},shift.notes||'--'),
                              ce(Td,null,ce(HStack,null,
                                                    ce(IconButton,{icon:ce(Edit,{size:14}),size:'xs',variant:'ghost',colorScheme:'blue','aria-label':'Edit',onClick:()=>onEdit(shift)}),
                                                    ce(IconButton,{icon:ce(Trash2,{size:14}),size:'xs',variant:'ghost',colorScheme:'red','aria-label':'Delete',onClick:()=>onDelete(shift.id)})
                                                  ))
                            );
      });
      return ce(Box, {bg:'white',rounded:'lg',shadow:'sm',border:'1px',borderColor:'gray.200',overflow:'hidden'},
                    ce(Flex,{px:4,py:3,borderBottom:'1px',borderColor:'gray.200',align:'center',justify:'space-between'},
                             ce(Heading,{size:'sm'},'All Shifts'),
                             ce(Badge,{colorScheme:'teal'},sorted.length+' shifts')
                           ),
                    ce(Box,{overflowX:'auto'},
                             ce(Table,{size:'sm'},
                                        ce(Thead,{bg:'gray.50'},
                                                     ce(Tr,null,
                                                                    ce(Th,null,'Date'),ce(Th,null,'Hours'),ce(Th,null,'Tips'),ce(Th,null,'Earnings'),
                                                                    ce(Th,null,'Floor'),ce(Th,null,'Tips/Hr'),ce(Th,null,'Notes'),ce(Th,null,'Actions')
                                                                  )
                                                   ),
                                        ce(Tbody,null,...rows)
                                      )
                           )
                  );
};
export default ShiftsByDay;
