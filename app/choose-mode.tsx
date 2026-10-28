import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '../src/theme';
import { useStore } from '../src/store';

export default function ChooseMode() {
  const { setMode } = useStore();
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Choose your experience</Text>
      </View>
      <Text style={styles.h1}>How will you use DigiTame?</Text>
      <Text style={styles.body}>You can change this any time in settings.</Text>
      {[
        {
          t: 'Personal Focus',
          d: 'Set your own app limits and protect time for the things you care about.',
        },
        { t: 'Parent & Guardian', d: 'Manage family screen time' },
        { t: 'Healthy Habits', d: 'Create routines that stick' },
      ].map((m, i) => (
        <View key={m.t} style={[styles.card, i === 0 && styles.cardActive]}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>{['◷', '◉', '✦'][i]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{m.t}</Text>
            <Text style={styles.cardBody}>{m.d}</Text>
          </View>
          {i === 0 ? <View style={styles.dot} /> : <Text style={styles.chev}>›</Text>}
        </View>
      ))}
      <View style={styles.note}>
        <Text style={styles.noteTitle}>✧ One account, flexible controls</Text>
        <Text style={styles.noteBody}>Switch modes as your needs change.</Text>
      </View>
      <Pressable
        style={styles.cta}
        onPress={() => {
          setMode('personal');
          router.push('/create-account');
        }}
      >
        <Text style={styles.ctaText}>Continue →</Text>
      </Pressable>
      <Text style={styles.terms}>By continuing, you agree to our Terms and Privacy Policy.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  h1: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 24 },
  body: { color: colors.textSecondary, fontSize: 16, marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.accent, backgroundColor: '#191846' },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#202254',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.accentLight, fontSize: 24 },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  cardBody: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent },
  chev: { color: colors.textMuted, fontSize: 28 },
  note: {
    backgroundColor: '#18143f',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#352b80',
  },
  noteTitle: { color: colors.accentLight, fontSize: 16, fontWeight: '700' },
  noteBody: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  cta: {
    marginTop: 'auto',
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  terms: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
