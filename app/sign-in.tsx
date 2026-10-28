import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';
import { useStore } from '../src/store';
import { Input } from '../src/components/Input';

export default function SignIn() {
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Welcome back</Text>
      </View>
      <View style={styles.logo}>
        <Text style={styles.logoText}>◷</Text>
      </View>
      <Text style={styles.h1}>Good to see you again.</Text>
      <Text style={styles.body}>Sign in to continue your progress.</Text>
      <Input
        label="EMAIL ADDRESS"
        placeholder="you@example.com"
        icon="✉"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="PASSWORD"
        placeholder="Enter your password"
        icon="⌑"
        value={password}
        onChangeText={setPassword}
      />
      <View style={styles.row}>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.remember}>Remember me</Text>
        <Text style={styles.forgot}>Forgot password?</Text>
      </View>
      <Button
        label="Sign in"
        onPress={() => {
          setUser({ name: 'Alex Morgan', email: email || 'alex@example.com' });
          router.push('/(tabs)');
        }}
      />
      <Text style={styles.or}>or sign in with</Text>
      <View style={styles.socialRow}>
        <View style={styles.social}>
          <Text style={styles.socialText}>G Google</Text>
        </View>
        <View style={styles.social}>
          <Text style={styles.socialText}>● Apple</Text>
        </View>
      </View>
      <Text style={styles.footer}>New to DigiTame? Create account</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#201757',
    borderWidth: 2,
    borderColor: '#6645cf',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  logoText: { color: colors.accent, fontSize: 40, fontWeight: '700' },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontWeight: '800' },
  remember: { color: colors.textSecondary, fontSize: 15, flex: 1 },
  forgot: { color: colors.accentLight, fontSize: 15, fontWeight: '600' },
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
