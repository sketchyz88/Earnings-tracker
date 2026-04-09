import React from 'react';
import { Box, Heading, Text, SimpleGrid, Badge } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
const ce = React.createElement;

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
    return ce(Box, { textAlign: 'center', py: 10, color: 'gray.500' },
      ce(Text, null, 'No floor data yet. Add shifts with a floor/section!')
    );
  }

  const cards = data.map(f =>
    ce(Box, { key: f.floor, bg: 'white', p: 4, rounded: 'lg', shadow: 'sm', border: '1px', borderColor: 'gray.200' },
      ce(Badge, { colorScheme: 'purple', mb: 2 }, f.floor),
      ce(Text, { fontSize: 'sm', color: 'gray.500' }, f.shifts + ' shifts - ' + f.hours + ' hrs'),
      ce(Text, { fontSize: 'xl', fontWeight: 'bold', color: 'green.600' }, '$' + f.tips.toFixed(2) + ' tips'),
      ce(Text, { fontSize: 'sm', color: 'teal.600' }, '$' + f.tipsPerHour + '/hr avg')
    )
  );

  return ce(Box, null,
    ce(SimpleGrid, { columns: { base: 1, md: 2, lg: 3 }, spacing: 4, mb: 6 }, ...cards),
    ce(Box, { bg: 'white', rounded: 'lg', shadow: 'sm', border: '1px', borderColor: 'gray.200', p: 5 },
      ce(Heading, { size: 'sm', mb: 4 }, 'Tips by Floor'),
      ce(ResponsiveContainer, { width: '100%', height: 220 },
        ce(BarChart, { data, margin: { top: 5, right: 20, left: 0, bottom: 5 } },
          ce(CartesianGrid, { strokeDasharray: '3 3' }),
          ce(XAxis, { dataKey: 'floor', tick: { fontSize: 12 } }),
          ce(YAxis, null),
          ce(Tooltip, { formatter: (v, n) => ['$' + v, n] }),
          ce(Legend, null),
          ce(Bar, { dataKey: 'tips', name: 'Total Tips', fill: '#38B2AC', radius: [4, 4, 0, 0] }),
          ce(Bar, { dataKey: 'tipsPerHour', name: 'Tips/Hr', fill: '#805AD5', radius: [4, 4, 0, 0] })
        )
      )
    )
  );
};

export default FloorComparison;
