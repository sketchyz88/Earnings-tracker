import { Alert, AlertDescription, AlertIcon, Box, Heading, SimpleGrid, Text } from '@chakra-ui/react';

function InfoCard({ title, body }) {
  return (
    <Box
      bg="#182133"
      borderRadius="2xl"
      border="1px solid"
      borderColor="whiteAlpha.100"
      p={{ base: 5, md: 6 }}
    >
      <Heading size="sm">{title}</Heading>
      <Text mt={3} color="gray.300" lineHeight="tall">
        {body}
      </Text>
    </Box>
  );
}

function AboutView() {
  return (
    <Box display="grid" gap={4}>
      <Box
        bg="#182133"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.100"
        p={{ base: 5, md: 6 }}
      >
        <Text fontSize="sm" color="teal.200" fontWeight="semibold" letterSpacing="0.08em">
          ABOUT THIS APP
        </Text>
        <Heading mt={2} size="lg">
          What Earnings Tracker does
        </Heading>
        <Text mt={3} color="gray.300" lineHeight="tall">
          Earnings Tracker helps servers log shifts, track sales and tips, subtract tip-out,
          calculate take-home pay, and review pay periods over time. You can type shifts in
          manually or scan receipt photos to prefill the details faster.
        </Text>
      </Box>

      <Alert
        status="info"
        borderRadius="2xl"
        bg="#132238"
        border="1px solid rgba(255,255,255,0.08)"
      >
        <AlertIcon />
        <AlertDescription>
          Privacy disclaimer: each person should use their own password-protected account. Other
          coworkers cannot see your shifts without signing into your account, and the app owner
          cannot view your private data just by sharing the website.
        </AlertDescription>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <InfoCard
          title="What gets tracked"
          body="Each shift can include the date, start time, end time, hours worked, sales, tips, floor, notes, and estimated base pay. The app also shows total tip-out removed and net tips after deductions."
        />
        <InfoCard
          title="How tip-out works"
          body="Tip-out is calculated as a percentage of sales using your settings. That amount is subtracted from gross tips so you can see what you actually kept for the shift and over each pay period."
        />
        <InfoCard
          title="How receipt scanning works"
          body="Receipt scans try to read the top receipt date and clock-out time, then use a default 5:00 PM start time to calculate hours automatically. The scanner also looks for sales and credit tips."
        />
        <InfoCard
          title="Best way to use it"
          body="Create your own account, log each shift with the real date, and import any older device-only data once if needed. Then use the Dashboard, By Day, Bi-Weekly, and Calendar views to look back at trends."
        />
      </SimpleGrid>
    </Box>
  );
}

export default AboutView;
