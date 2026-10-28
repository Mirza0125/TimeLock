import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius } from '../theme';

export function Input({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
}: {
  label?: string;
  placeholder: string;
  icon?: string;
  value?: string;
  onChangeText?: (t: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  field: {
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: 16,
    paddingEnd: 16,
    gap: 12,
  },
  icon: { color: colors.accentLight, fontSize: 22, fontWeight: '700' },
  input: { flex: 1, color: colors.text, fontSize: 17 },
});
