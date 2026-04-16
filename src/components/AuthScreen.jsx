import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';

function AuthScreen({ isSubmitting, authError, authMessage, onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signIn');
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
  });

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (mode === 'signIn') {
      await onSignIn({
        email: form.email.trim(),
        password: form.password,
      });
      return;
    }

    await onSignUp({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      password: form.password,
    });
  }

  return (
    <Box
      minH="100vh"
      px={4}
      py={10}
      bg="radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 22%), linear-gradient(180deg, #fafcff 0%, #f5f7fb 56%, #eef2f7 100%)"
    >
      <Box
        maxW="520px"
        mx="auto"
        bg="rgba(255, 255, 255, 0.92)"
        border="1px solid"
        borderColor="rgba(22, 33, 43, 0.08)"
        borderRadius="3xl"
        p={{ base: 6, md: 8 }}
        boxShadow="0 24px 60px rgba(34, 46, 56, 0.08)"
      >
        <Text fontSize="sm" color="brand.600" fontWeight="semibold" letterSpacing="0.14em">
          SECURE ACCOUNTS
        </Text>
        <Heading mt={2} size="lg" letterSpacing="-0.03em" color="#18222c">
          Sign in to your earnings account
        </Heading>
        <Text mt={3} color="gray.600" lineHeight="tall">
          Each coworker gets a separate login, separate shifts, and their own synced data on phone
          and desktop.
        </Text>

        <Alert
          status="info"
          mt={5}
          borderRadius="2xl"
          bg="rgba(250, 251, 249, 0.95)"
          color="gray.700"
          border="1px solid rgba(22, 33, 43, 0.06)"
        >
          <AlertIcon />
          <Box>
            <AlertTitle mb={1}>Privacy note</AlertTitle>
            <AlertDescription>
              Other coworkers cannot open your account without your password, and the app owner
              cannot see your private shift data just by running the site.
            </AlertDescription>
          </Box>
        </Alert>

        <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} mt={6}>
          <Button
            onClick={() => setMode('signIn')}
            bg={mode === 'signIn' ? 'brand.600' : 'transparent'}
            color={mode === 'signIn' ? 'white' : 'gray.700'}
            variant={mode === 'signIn' ? 'solid' : 'outline'}
            borderColor="rgba(22, 33, 43, 0.12)"
            _hover={{
              bg: mode === 'signIn' ? 'brand.700' : 'blackAlpha.50',
            }}
            flex={1}
          >
            Sign In
          </Button>
          <Button
            onClick={() => setMode('signUp')}
            bg={mode === 'signUp' ? 'brand.600' : 'transparent'}
            color={mode === 'signUp' ? 'white' : 'gray.700'}
            variant={mode === 'signUp' ? 'solid' : 'outline'}
            borderColor="rgba(22, 33, 43, 0.12)"
            _hover={{
              bg: mode === 'signUp' ? 'brand.700' : 'blackAlpha.50',
            }}
            flex={1}
          >
            Create Account
          </Button>
        </Stack>

        {authError ? (
          <Alert status="error" mt={5} borderRadius="2xl" bg="red.900" color="red.100">
            <AlertIcon />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        ) : null}

        {authMessage ? (
          <Alert status="success" mt={5} borderRadius="2xl" bg="green.900" color="green.100">
            <AlertIcon />
            <Box>
              <AlertTitle mb={1}>Account step complete</AlertTitle>
              <AlertDescription>{authMessage}</AlertDescription>
            </Box>
          </Alert>
        ) : null}

        <Box as="form" mt={6} display="grid" gap={4} onSubmit={handleSubmit}>
          {mode === 'signUp' ? (
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                value={form.displayName}
                onChange={(event) => updateField('displayName', event.target.value)}
                placeholder="Dylan"
              />
              <FormHelperText color="gray.500">
                This is the profile name shown inside the app.
              </FormHelperText>
            </FormControl>
          ) : null}

          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            />
          </FormControl>

          <Button
            mt={2}
            bg="brand.600"
            color="white"
            _hover={{ bg: 'brand.700' }}
            type="submit"
            isLoading={isSubmitting}
          >
            {mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default AuthScreen;
