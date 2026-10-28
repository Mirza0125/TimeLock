import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';
import { useStore } from '../src/store';
import { useState } from 'react';

export default function AppLimit() {
  const { apps, selectedApp, setAppLimit } = useStore();
  const app = apps.find((a) => a.id === selectedApp) ?? apps[0];
  const [limit, setLimit] = useState(app.limit);
  const [days, setDays] = useState([true, true, true, true, true, false, false]);
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Set app limit</Text>
      </View>
      <View style={styles.appCard}>
        <View style={styles.appIcon}>
          <Text style={styles.appIconText}>▶</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>{app.name}</Text>
          <Text style={styles.appSub}>Video & entertainment</Text>
        </View>
        <View style={styles.enabled}>
          <Text style={styles.enabledText}>Enabled</Text>
        </View>
      </View>
      <Text style={styles.section}>Daily time limit</Text>
      <Text style={styles.sectionSub}>Choose how long this app is available each day.</Text>
      <View style={styles.dialCard}>
        <Pressable style={styles.dialBtn} onPress={() => setLimit((l) => Math.max(0, l - 5))}>
          <Text style={styles.dialBtnText}>−</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.dialValue}>
            {Math.floor(limit / 60)}h {limit % 60}m
          </Text>
          <Text style={styles.dialSub}>per day</Text>
        </View>
        <Pressable style={styles.dialBtnPrimary} onPress={() => setLimit((l) => l + 5)}>
          <Text style={styles.dialBtnText}>+</Text>
        </Pressable>
        <View style={styles.slider}>
          <View style={styles.sliderFill} />
        </View>
      </View>
      <Text style={styles.section}>Allowed days</Text>
      <View style={styles.days}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Pressable
            key={i}
            style={[styles.day, days[i] ? styles.dayOn : styles.dayOff]}
            onPress={() => setDays((ds) => ds.map((x, j) => (j === i ? !x : x)))}
          >
            <Text style={styles.dayText}>{d}</Text>
          </Pressable>
        ))}
      </View>
      {['Schedule', 'When limit is reached', 'Daily reset'].map((t, i) => (
        <View key={t} style={styles.listRow}>
          <View>
            <Text style={styles.listTitle}>{t}</Text>
            <Text style={styles.listSub}>
              {['Available all day', 'Pause app and show a reminder', '12:00 AM · Local time'][i]}
            </Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </View>
      ))}
      <Button
        label="Save limit"
        onPress={() => {
          setAppLimit(app.id, limit);
          router.back();
        }}
      />
      <Text style={styles.footer}>You can edit this limit whenever you need.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ff355d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  appName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  appSub: { color: colors.textSecondary, fontSize: 13 },
  enabled: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  enabledText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 20 },
  sectionSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  dialCard: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 12,
  },
  dialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialBtnPrimary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialBtnText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  dialValue: { color: colors.text, fontSize: 36, fontWeight: '800' },
  dialSub: { color: colors.textSecondary, fontSize: 14 },
  slider: { width: '100%', height: 8, backgroundColor: '#282b58', borderRadius: 4, marginTop: 8 },
  sliderFill: { width: '60%', height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  days: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.accent },
  dayOff: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  dayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  listSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  chev: { color: colors.textMuted, fontSize: 24 },
  footer: { color: colors.textMuted, textAlign: 'center', fontSize: 13, marginTop: 12 },
});
