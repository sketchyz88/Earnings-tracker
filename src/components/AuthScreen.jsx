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
      bg="radial-gradient(circle at top, rgba(31,154,104,0.12), transparent 24%), linear-gradient(180deg, #09131d 0%, #07111a 50%, #050c13 100%)"
    >
      <Box
        maxW="520px"
        mx="auto"
        bg="rgba(11, 21, 31, 0.92)"
        border="1px solid"
        borderColor="rgba(188, 212, 198, 0.12)"
        borderRadius="3xl"
        p={{ base: 6, md: 8 }}
        boxShadow="0 30px 70px rgba(0,0,0,0.34)"
      >
        <Text fontSize="sm" color="green.200" fontWeight="semibold" letterSpacing="0.14em">
          SECURE ACCOUNTS
        </Text>
        <Heading mt={2} size="lg" letterSpacing="-0.03em">
          Sign in to your earnings account
        </Heading>
        <Text mt={3} color="gray.400" lineHeight="tall">
          Each coworker gets a separate login, separate shifts, and their own synced data on phone
          and desktop.
        </Text>

        <Alert
          status="info"
          mt={5}
          borderRadius="2xl"
          bg="rgba(19, 34, 56, 0.78)"
          color="blue.100"
          border="1px solid rgba(125, 211, 252, 0.14)"
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
            bg={mode === 'signIn' ? 'brand.400' : 'transparent'}
            color={mode === 'signIn' ? '#08120d' : 'gray.200'}
            variant={mode === 'signIn' ? 'solid' : 'outline'}
            borderColor="rgba(188, 212, 198, 0.16)"
            _hover={{
              bg: mode === 'signIn' ? 'brand.300' : 'whiteAlpha.100',
            }}
            flex={1}
          >
            Sign In
          </Button>
          <Button
            onClick={() => setMode('signUp')}
            bg={mode === 'signUp' ? 'brand.400' : 'transparent'}
            color={mode === 'signUp' ? '#08120d' : 'gray.200'}
            variant={mode === 'signUp' ? 'solid' : 'outline'}
            borderColor="rgba(188, 212, 198, 0.16)"
            _hover={{
              bg: mode === 'signUp' ? 'brand.300' : 'whiteAlpha.100',
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
            bg="brand.400"
            color="#08120d"
            _hover={{ bg: 'brand.300' }}
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
