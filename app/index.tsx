import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ScreenGuard, { BLOCK_STRATEGIES, BLOCK_STRATEGY_LABELS, type BlockStrategy } from '../modules/screen-guard';

export default function Home() {
  const [strategy, setStrategy] = useState<BlockStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const value = await ScreenGuard.getBlockStrategy();
      setStrategy(value);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onPressStrategy = useCallback(
    async (value: BlockStrategy) => {
      try {
        await ScreenGuard.setBlockStrategy(value);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refresh]
  );

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
