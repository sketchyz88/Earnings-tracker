import { Box, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import { ACCENTS, RADII, palette } from '../theme/tokens';
import { Label, Panel } from './ui';

const CARDS = [
  {
    title: 'What gets tracked',
    body: 'Each shift can include the date, start and end time, hours, sales, tips, floor or section, notes, and base pay. tips.cafe subtracts tip-out and shows what you actually kept.',
  },
  {
    title: 'How tip-out works',
    body: 'Tip-out is a percentage of sales, set in Settings. It comes out of your gross tips, so every total you see is what lands in your pocket.',
  },
  {
    title: 'Receipt scanning',
    body: 'Snap or upload your checkout receipt. The scanner reads the date, clock-out time, sales, and credit tips, and assumes a 5:00 PM start to work out hours. You can fix anything before saving.',
  },
  {
    title: 'Getting the most out of it',
    body: 'Log every shift with its section. After a few weeks, Insights shows which days and sections pay best per hour, and Pay periods tracks you against your goals. Press N on a keyboard to add a shift fast.',
  },
];

function AboutView({ isDarkMode = false }) {
  const tokens = palette(isDarkMode);
  return (
    <Box display="grid" gap={4}>
      <Panel isDarkMode={isDarkMode}>
        <Label isDarkMode={isDarkMode} color={ACCENTS.primary}>
          About tips.cafe
        </Label>
        <Heading mt={2} size="lg" letterSpacing="-0.03em" color={tokens.text}>
          Know what you actually take home
        </Heading>
        <Text mt={3} color={tokens.textMuted} lineHeight="tall" maxW="70ch">
          tips.cafe helps servers log shifts, track sales and tips, subtract tip-out, and see real
          take-home pay by shift, pay period, day of the week, and section. Type shifts in or scan a
          receipt to fill them in faster.
        </Text>
        <Box
          mt={5}
          p={4}
          borderRadius={RADII.lg}
          bg={tokens.surfaceSunken}
          border="1px solid"
          borderColor={tokens.border}
        >
          <Text fontSize="sm" fontWeight={600} color={tokens.text}>
            Your data is private
          </Text>
          <Text mt={1} fontSize="sm" color={tokens.textMuted} lineHeight="1.6">
            Each person uses their own password-protected account. Coworkers can&rsquo;t see your
            shifts, and sharing the website doesn&rsquo;t give anyone access to your numbers.
          </Text>
        </Box>
      </Panel>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {CARDS.map((card) => (
          <Panel key={card.title} isDarkMode={isDarkMode}>
            <Heading size="sm" letterSpacing="-0.02em" color={tokens.text}>
              {card.title}
            </Heading>
            <Text mt={2} color={tokens.textMuted} fontSize="sm" lineHeight="1.65">
              {card.body}
            </Text>
          </Panel>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default AboutView;
