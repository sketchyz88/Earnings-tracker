import { Box, Heading, Text, SimpleGrid, Badge } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#38B2AC', '#805AD5', '#ED8936', '#E53E3E', '#48BB78'];

const FloorComparison = ({ shifts }) => {
    const floors = {};
    (shifts || []).forEach(s => {
          const f = s.floor || 'Unspecified';
          if (!floors[f]) floors[f] = { floor: f, shifts: 0, hours: 0, tips: 0, earnings: 0 };
          floors[f].shifts++;
          floors[f].hours += parseFloat(s.hours) || 0;
          floors[f].tips += parseFloat(s.tips) || 0;
          floors[f].earnings += parseFloat(s.earnings) || 0;
    });

    const data = Object.values(floors).map(f => ({
          ...f,
          hours: parseFloat(f.hours.toFixed(1)),
          tips: parseFloat(f.tips.toFixed(2)),
          tipsPerHour: f.hours > 0 ? parseFloat((f.tips / f.hours).toFixed(2)) : 0,
    }));

    if (!data.length) {
          return <Box textAlign="center" py={10} color="gray.500"><Text>No floor data yet. Add shifts with a floor/section!</Text>Text></Box>Box>;
    }
  
    return (
          <Box>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={6}>
                  {data.map((f, idx) => (
                      <Box key={f.floor} bg="white" p={4} rounded="lg" shadow="sm" border="1px" borderColor="gray.200">
                                  <Badge colorScheme="purple" mb={2}>{f.floor}</Badge>Badge>
                                  <Text fontSize="sm" color="gray.500">{f.shifts} shifts · {f.hours} hrs</Text>Text>
                                  <Text fontSize="xl" fontWeight="bold" color="green.600">${f.tips.toFixed(2)} tips</Text>Text>
                                  <Text fontSize="sm" color="teal.600">${f.tipsPerHour}/hr avg</Text>Text>
                      </Box>Box>
                    ))}
                </SimpleGrid>SimpleGrid>
          
                <Box bg="white" rounded="lg" shadow="sm" border="1px" borderColor="gray.200" p={5}>
                        <Heading size="sm" mb={4}>Tips by Floor</Heading>Heading>
                        <ResponsiveContainer width="100%" height={220}>
                                  <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="floor" tick={{ fontSize: 12 }} />
                                              <YAxis />
                                              <Tooltip formatter={(v, name) => [`$${v}`, name]} />
                                              <Legend />
                                              <Bar dataKey="tips" name="Total Tips" fill="#38B2AC" radius={[4, 4, 0, 0]} />
                                              <Bar dataKey="tipsPerHour" name="Tips/Hr" fill="#805AD5" radius={[4, 4, 0, 0]} />
                                  </BarChart>BarChart>
                        </ResponsiveContainer>ResponsiveContainer>
                </Box>Box>
          </Box>Box>
        );
};

export default FloorComparison;</Box>
