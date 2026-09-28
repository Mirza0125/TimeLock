import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ScreenGuard, {
  BLOCK_STRATEGIES,
  BLOCK_STRATEGY_LABELS,
  type BlockStrategy,
} from '../modules/screen-guard';

export default function Home() {
  const [strategy, setStrategy] = useState<BlockStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Inline IIFE (not a named/memoized function) so the initial fetch stays
    // an effect that synchronizes with the native module, not a call that
    // react-hooks/set-state-in-effect flags as a cascading-render risk.
    (async () => {
      try {
        const value = await ScreenGuard.getBlockStrategy();
        if (cancelled) return;
        setStrategy(value);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Generation token: guards against two overlapping setBlockStrategy/
  // getBlockStrategy promise pairs resolving out of order (WR-05) - only the
  // response from the most recently pressed strategy is allowed to update
  // state.
  const requestIdRef = useRef(0);
  const onPressStrategy = useCallback(async (value: BlockStrategy) => {
    const requestId = ++requestIdRef.current;
    try {
      await ScreenGuard.setBlockStrategy(value);
      const refreshed = await ScreenGuard.getBlockStrategy();
      if (requestId !== requestIdRef.current) return; // superseded by a newer press
      setStrategy(refreshed);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text testID="block-strategy-value" style={styles.value}>
        Block strategy: {strategy ?? 'loading'}
      </Text>
      {error ? (
        <Text testID="native-error" style={styles.error}>
          Native module error: {error}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        {BLOCK_STRATEGIES.map((value) => (
          <Pressable
            key={value}
            testID={`strategy-${value}`}
            accessibilityRole="button"
            accessibilityLabel={BLOCK_STRATEGY_LABELS[value]}
            style={styles.button}
            onPress={() => onPressStrategy(value)}
          >
            <Text style={styles.buttonLabel}>{BLOCK_STRATEGY_LABELS[value]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.testApp}>Designated test app: Clock (com.google.android.deskclock)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingStart: 24,
    paddingEnd: 24,
    gap: 16,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: '#B00020',
    textAlign: 'center',
  },
  buttons: {
    gap: 12,
    alignSelf: 'stretch',
  },
  button: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingStart: 16,
    paddingEnd: 16,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
  },
  testApp: {
    marginTop: 24,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
