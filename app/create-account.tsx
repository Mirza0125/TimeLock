import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';
import { Input } from '../src/components/Input';
import { useStore } from '../src/store';

export default function CreateAccount() {
  const { setUser } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Create account</Text>
      </View>
      <Text style={styles.h1}>Let’s get you started.</Text>
      <Text style={styles.body}>Create an account to personalize your limits.</Text>
      <Input
        label="FULL NAME"
        placeholder="Alex Morgan"
        icon="♙"
        value={name}
        onChangeText={setName}
      />
      <Input
        label="EMAIL ADDRESS"
        placeholder="you@example.com"
        icon="✉"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="PASSWORD"
        placeholder="At least 8 characters"
        icon="⌑"
        value={password}
        onChangeText={setPassword}
      />
      <View style={styles.checkRow}>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.checkLabel}>I agree to the Terms of Service and Privacy Policy</Text>
      </View>
      <Button
        label="Create account"
        onPress={() => {
          setUser({ name: name || 'Alex Morgan', email: email || 'alex@example.com' });
          router.push('/permissions');
        }}
      />
      <Text style={styles.or}>or continue with</Text>
      <View style={styles.socialRow}>
        <View style={styles.social}>
          <Text style={styles.socialText}>G Google</Text>
        </View>
        <View style={styles.social}>
          <Text style={styles.socialText}>● Apple</Text>
        </View>
      </View>
      <Text style={styles.footer}>Already have an account? Sign in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 8 },
  body: { color: colors.textSecondary, fontSize: 15 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontWeight: '800' },
  checkLabel: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  or: { color: colors.textMuted, textAlign: 'center', fontSize: 15 },
  socialRow: { flexDirection: 'row', gap: 12 },
  social: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  footer: { color: colors.textSecondary, textAlign: 'center', fontSize: 16 },
});
