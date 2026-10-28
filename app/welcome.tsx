import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '../src/theme';

export default function Splash() {
  return (
    <View style={styles.root}>
      <View style={styles.glow} />
      <View style={styles.logo}>
        <Text style={styles.logoIcon}>◷</Text>
      </View>
      <Text style={styles.title}>DigiTame</Text>
      <Text style={styles.tagline}>YOUR TIME. YOUR RULES.</Text>
      <Text style={styles.headline}>Build healthier digital habits.</Text>
      <Text style={styles.body}>
        Set limits, stay focused, and help your family find a better balance.
      </Text>
      <Pressable style={styles.cta} onPress={() => router.push('/onboarding')}>
        <Text style={styles.ctaText}>Get Started →</Text>
      </Pressable>
      <Text style={styles.signin}>Already have an account? Sign in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#762dff',
    opacity: 0.25,
    top: 120,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#171744',
    borderWidth: 2,
    borderColor: '#5141b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoIcon: { color: '#a855f7', fontSize: 56, fontWeight: '700' },
  title: { color: '#fff', fontSize: 44, fontWeight: '800' },
  tagline: { color: '#baadff', fontSize: 13, fontWeight: '700', letterSpacing: 6, marginTop: 8 },
  headline: {
    color: '#f4f1ff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 80,
    textAlign: 'center',
  },
  body: { color: '#a9afd8', fontSize: 16, textAlign: 'center', marginTop: 8 },
  cta: {
    marginTop: 60,
    width: '100%',
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  signin: { color: '#b9b4e4', fontSize: 15, marginTop: 20 },
});
