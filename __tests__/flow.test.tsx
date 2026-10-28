import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { StoreProvider } from '../src/store';
import SignIn from '../app/sign-in';
import Welcome from '../app/welcome';
import { router } from 'expo-router';

jest.mock('../modules/screen-guard/src/ScreenGuardModule', () => ({
  __esModule: true,
  default: {
    getBlockStrategy: jest.fn(),
    setBlockStrategy: jest.fn(),
    saveAppState: jest.fn(),
    loadAppState: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

beforeEach(() => {
  (router.push as jest.Mock).mockClear();
  (router.replace as jest.Mock).mockClear();
});

describe('Sign in flow', () => {
  it('renders sign in screen', async () => {
    await render(
      <StoreProvider>
        <SignIn />
      </StoreProvider>,
    );
    await screen.findByText('Sign in');
  });

  it('navigates to tabs on sign in', async () => {
    await render(
      <StoreProvider>
        <SignIn />
      </StoreProvider>,
    );
    fireEvent.press(screen.getByText('Sign in'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('Welcome flow', () => {
  it('renders welcome screen', async () => {
    await render(
      <StoreProvider>
        <Welcome />
      </StoreProvider>,
    );
    await screen.findByText('Get Started  →');
  });
});
