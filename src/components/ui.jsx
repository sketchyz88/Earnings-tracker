/**
 * Small shared building blocks so every view uses the same surfaces, labels
 * and controls — and so nothing hardcodes a dark-only or light-only color.
 */
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { ACCENTS, RADII, palette } from '../theme/tokens';

export function Panel({ isDarkMode, children, padded = true, ...rest }) {
  const tokens = palette(isDarkMode);
  return (
    <Box
      bg={tokens.surface}
      backdropFilter="blur(12px)"
      borderRadius={RADII.xl}
      border="1px solid"
      borderColor={tokens.border}
      boxShadow={tokens.shadow}
      p={padded ? { base: 4, md: 6 } : 0}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function PanelHeader({ isDarkMode, title, subtitle, right, mb = 5 }) {
  const tokens = palette(isDarkMode);
  return (
    <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} gap={3} mb={mb} wrap="wrap">
      <Box minW={0}>
        <Heading size="sm" letterSpacing="-0.02em" color={tokens.text}>
          {title}
        </Heading>
        {subtitle ? (
          <Text mt={1} color={tokens.textMuted} fontSize="13px" lineHeight="1.5" data-numeric>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {right}
    </Flex>
  );
}

export function Label({ isDarkMode, children, ...rest }) {
  const tokens = palette(isDarkMode);
  return (
    <Text
      color={tokens.textMuted}
      fontSize="11px"
      fontWeight={600}
      letterSpacing="0.08em"
      textTransform="uppercase"
      {...rest}
    >
      {children}
    </Text>
  );
}

export function EmptyState({ isDarkMode, title, subtitle, action }) {
  const tokens = palette(isDarkMode);
  return (
    <Box
      textAlign="center"
      py={12}
      px={6}
      borderRadius={RADII.xl}
      border="1px dashed"
      borderColor={tokens.borderStrong}
      bg={tokens.surfaceSunken}
    >
      <Text fontSize="md" fontWeight={600} color={tokens.text}>
        {title}
      </Text>
      {subtitle ? (
        <Text mt={1.5} color={tokens.textMuted} fontSize="sm" maxW="46ch" mx="auto">
          {subtitle}
        </Text>
      ) : null}
      {action ? <Box mt={4}>{action}</Box> : null}
    </Box>
  );
}

/** A row of pill buttons where exactly one is active. */
export function Segmented({ isDarkMode, options, value, onChange, size = 'sm', ...rest }) {
  const tokens = palette(isDarkMode);
  return (
    <Flex
      gap={1}
      p="3px"
      bg={tokens.surfaceSunken}
      border="1px solid"
      borderColor={tokens.border}
      borderRadius={RADII.pill}
      wrap="nowrap"
      width="fit-content"
      maxW="100%"
      overflowX="auto"
      sx={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
      {...rest}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Button
            key={option.value}
            size={size}
            h={size === 'xs' ? '26px' : '30px'}
            px={3}
            flexShrink={0}
            borderRadius={RADII.pill}
            fontSize="13px"
            fontWeight={isActive ? 600 : 500}
            bg={isActive ? tokens.surfaceRaised : 'transparent'}
            color={isActive ? tokens.text : tokens.textMuted}
            boxShadow={isActive ? tokens.shadow : 'none'}
            _hover={{ color: tokens.text, bg: isActive ? tokens.surfaceRaised : 'transparent' }}
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
          >
            {option.label}
          </Button>
        );
      })}
    </Flex>
  );
}

/** Small pill for tags like job or floor. */
export function Tag({ isDarkMode, children, tone = 'neutral' }) {
  const tokens = palette(isDarkMode);
  const isAccent = tone === 'accent';
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      fontSize="11px"
      fontWeight={600}
      lineHeight="1"
      px={2}
      py="5px"
      borderRadius={RADII.pill}
      color={isAccent ? ACCENTS.primary : tokens.textMuted}
      bg={isAccent ? ACCENTS.primaryMuted : tokens.surfaceSunken}
      border="1px solid"
      borderColor={isAccent ? 'transparent' : tokens.border}
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );
}
