import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '../src/theme';

export default function Onboarding() {
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Text style={styles.back}>‹</Text>
        <Text style={styles.skip}>Skip</Text>
      </View>
      <Text style={styles.h1}>A better balance</Text>
      <Text style={styles.h2}>Make room for what matters.</Text>
      <Text style={styles.body}>
        Gentle boundaries for a more intentional digital life — one app at a time.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today, in balance</Text>
        <Text style={styles.cardValue}>2h 15m</Text>
        <Text style={styles.cardSub}>of 4h goal</Text>
      </View>
      <Text style={styles.section}>Small changes, real progress</Text>
      {['Set limits', 'Build focus', 'See progress'].map((t, i) => (
        <View key={t} style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{String(i + 1).padStart(2, '0')}</Text>
          </View>
          <View>
            <Text style={styles.rowTitle}>{t}</Text>
            <Text style={styles.rowSub}>
              {
                [
                  'Choose time for each app',
                  'Create distraction-free time',
                  'Understand your habits',
                ][i]
              }
            </Text>
          </View>
        </View>
      ))}
      <Pressable style={styles.cta} onPress={() => router.push('/choose-mode')}>
        <Text style={styles.ctaText}>Continue →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  back: { color: colors.text, fontSize: 32 },
  skip: { color: colors.accentLight, fontSize: 18, fontWeight: '600' },
  h1: { color: colors.text, fontSize: 32, fontWeight: '700', marginTop: 24 },
  h2: { color: colors.accentLight, fontSize: 30, fontWeight: '800', marginTop: 8 },
  body: { color: colors.textSecondary, fontSize: 16, marginTop: 12 },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  cardTitle: { color: colors.textSecondary, fontSize: 16 },
  cardValue: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 8 },
  cardSub: { color: colors.textSecondary, fontSize: 14 },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '800' },
  rowTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  rowSub: { color: colors.textSecondary, fontSize: 14 },
  cta: {
    marginTop: 'auto',
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
