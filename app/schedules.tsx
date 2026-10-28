import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';

export default function Schedules() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Schedules</Text>
      </View>
      <Text style={styles.sub}>Make time boundaries automatic.</Text>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>WEEKLY SCHEDULE</Text>
        <Text style={styles.heroTitle}>School / work days</Text>
        <Text style={styles.heroSub}>Monday – Friday</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroKey}>Downtime starts</Text>
          <Text style={styles.heroVal}>9:30 PM</Text>
        </View>
      </View>
      <Text style={styles.section}>Choose days</Text>
      <View style={styles.days}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <View key={d} style={[styles.day, i < 5 ? styles.dayOn : styles.dayOff]}>
            <Text style={styles.dayText}>{d}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.section}>Time windows</Text>
      {[
        {
          t: 'Evening wind-down',
          sub: 'Pause distracting apps before bed',
          a: '9:30 PM',
          b: '7:00 AM',
        },
        { t: 'Study time', sub: 'Keep learning apps available', a: '4:00 PM', b: '5:30 PM' },
        { t: 'Family time', sub: 'Reduce interruptions at dinner', a: '6:30 PM', b: '7:30 PM' },
      ].map((w) => (
        <View key={w.t} style={styles.window}>
          <View style={styles.windowIcon}>
            <Text style={styles.windowIconText}>◷</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.windowTitle}>{w.t}</Text>
            <Text style={styles.windowSub}>{w.sub}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.windowTime}>{w.a}</Text>
            <Text style={styles.windowTime2}>{w.b}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </View>
      ))}
      <View style={styles.exceptions}>
        <Text style={styles.exTitle}>Exceptions</Text>
        <Text style={styles.exBody}>Allow important apps during scheduled downtime.</Text>
      </View>
      <Button label="Save schedule" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: 15, marginBottom: 16 },
  hero: {
    backgroundColor: colors.panel2,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  heroLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroSub: { color: colors.textSecondary, fontSize: 14 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  heroKey: { color: colors.textSecondary, fontSize: 14 },
  heroVal: { color: colors.accentLight, fontSize: 18, fontWeight: '800' },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  days: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  day: { width: 44, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.accent },
  dayOff: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  dayText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  window: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  windowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#33206d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowIconText: { color: colors.accentLight, fontSize: 18 },
  windowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  windowSub: { color: colors.textSecondary, fontSize: 12 },
  windowTime: { color: colors.text, fontSize: 14, fontWeight: '700' },
  windowTime2: { color: colors.textSecondary, fontSize: 13 },
  chev: { color: colors.textMuted, fontSize: 20, marginStart: 8 },
  exceptions: {
    backgroundColor: '#15163b',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  exBody: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
});
