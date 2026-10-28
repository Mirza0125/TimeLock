import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '../theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 58, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85 },
  label: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
