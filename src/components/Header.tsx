import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '../theme';

export function Header({ title, rightLabel }: { title: string; rightLabel?: string }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {rightLabel ? (
        <Text style={styles.rightText}>{rightLabel}</Text>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: { color: colors.text, fontSize: 28, fontWeight: '400' },
  title: { flex: 1, color: colors.text, fontSize: 26, fontWeight: '700' },
  rightText: { color: colors.accentLight, fontSize: 18, fontWeight: '600' },
  spacer: { width: 44 },
});
