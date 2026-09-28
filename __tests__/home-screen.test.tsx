import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Home from '../app/index';
import ScreenGuardModule from '../modules/screen-guard/src/ScreenGuardModule';

// Only the native binding is mocked — the barrel's pure exports (blockStrategy
// helpers, labels) stay real, so this test exercises the actual Home
// read/write/error wiring against a fake native module. jest.mock calls are
// hoisted above these imports by babel-jest, so this still intercepts the
// module before Home (transitively) imports it.
jest.mock('../modules/screen-guard/src/ScreenGuardModule', () => ({
  __esModule: true,
  default: {
    getBlockStrategy: jest.fn(),
    setBlockStrategy: jest.fn(),
  },
}));

const mockGetBlockStrategy = ScreenGuardModule.getBlockStrategy as jest.Mock;
const mockSetBlockStrategy = ScreenGuardModule.setBlockStrategy as jest.Mock;

beforeEach(() => {
  mockGetBlockStrategy.mockReset();
  mockSetBlockStrategy.mockReset();
});

describe('Home read path', () => {
  it('shows the strategy returned by the native module', async () => {
    mockGetBlockStrategy.mockResolvedValue('activityFirst');

    await render(<Home />);

    await screen.findByText('Block strategy: activityFirst');
  });
});

describe('Home write path', () => {
  it('sets then re-reads the strategy, displaying the re-read value', async () => {
    mockGetBlockStrategy.mockResolvedValueOnce('off').mockResolvedValueOnce('homeNotification');
    mockSetBlockStrategy.mockResolvedValue(undefined);

    await render(<Home />);
    await screen.findByText('Block strategy: off');

    fireEvent.press(screen.getByTestId('strategy-homeNotification'));

    await waitFor(() => {
      expect(mockSetBlockStrategy).toHaveBeenCalledTimes(1);
    });
    expect(mockSetBlockStrategy).toHaveBeenCalledWith('homeNotification');
    expect(mockGetBlockStrategy).toHaveBeenCalledTimes(2);

    await screen.findByText('Block strategy: homeNotification');
  });
});

describe('Home error path', () => {
  it('shows a native-error element when getBlockStrategy rejects', async () => {
    mockGetBlockStrategy.mockRejectedValue(new Error('boom'));

    await render(<Home />);

    const errorNode = await screen.findByTestId('native-error');
    expect(errorNode).toHaveTextContent(/^Native module error:/);
  });
});
