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
    <Box minH="100vh" bg="#101726" px={4} py={10}>
      <Box
        maxW="520px"
        mx="auto"
        bg="#151f30"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="3xl"
        p={{ base: 6, md: 8 }}
        boxShadow="2xl"
      >
        <Text fontSize="sm" color="teal.200" fontWeight="semibold" letterSpacing="0.08em">
          CLOUD ACCOUNTS
        </Text>
        <Heading mt={2} size="lg">
          Sign in to your earnings account
        </Heading>
        <Text mt={3} color="gray.400">
          Each coworker gets a separate login, separate shifts, and their own synced data on phone
          and desktop.
        </Text>

        <Alert status="info" mt={5} borderRadius="xl" bg="#132238" color="blue.100">
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
            colorScheme={mode === 'signIn' ? 'teal' : 'gray'}
            variant={mode === 'signIn' ? 'solid' : 'outline'}
            flex={1}
          >
            Sign In
          </Button>
          <Button
            onClick={() => setMode('signUp')}
            colorScheme={mode === 'signUp' ? 'teal' : 'gray'}
            variant={mode === 'signUp' ? 'solid' : 'outline'}
            flex={1}
          >
            Create Account
          </Button>
        </Stack>

        {authError ? (
          <Alert status="error" mt={5} borderRadius="xl" bg="red.900" color="red.100">
            <AlertIcon />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        ) : null}

        {authMessage ? (
          <Alert status="success" mt={5} borderRadius="xl" bg="green.900" color="green.100">
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

          <Button mt={2} colorScheme="teal" type="submit" isLoading={isSubmitting}>
            {mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default AuthScreen;
