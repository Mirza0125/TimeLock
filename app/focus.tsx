import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';
import { useStore } from '../src/store';

export default function Focus() {
  const { focusActive, focusRemaining, startFocus, stopFocus, tickFocus } = useStore();
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startFocus(30);
    return () => stopFocus();
  }, [startFocus, stopFocus]);
  useEffect(() => {
    if (!focusActive) return;
    const id = setInterval(() => tickFocus(), 1000);
    return () => clearInterval(id);
  }, [focusActive, tickFocus]);
  const mins = Math.floor(focusRemaining / 60);
  const secs = focusRemaining % 60;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Focus session</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.end}>End</Text>
        </Pressable>
      </View>
      <Text style={styles.h1}>Deep focus</Text>
      <Text style={styles.sub}>One thing at a time. You’ve got this.</Text>
      <View style={styles.ring}>
        <Text style={styles.time}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </Text>
        <Text style={styles.timeLabel}>TIME LEFT</Text>
        <Text style={styles.until}>Focus until 10:30 AM</Text>
      </View>
      <View style={styles.paused}>
        <Text style={styles.pausedLabel}>APPS PAUSED</Text>
        <View style={styles.appRow}>
          {['◎', '♪', '▶', '✦'].map((i) => (
            <View key={i} style={styles.appIcon}>
              <Text style={styles.appIconText}>{i}</Text>
            </View>
          ))}
          <Text style={styles.pausedText}>4 distracting apps are paused</Text>
        </View>
      </View>
      <Text style={styles.section}>Your focus plan</Text>
      {[
        ['Session length', '30 minutes'],
        ['Break reminder', 'After this session'],
        ['Allowed apps', 'Phone, Calendar, Notes'],
      ].map(([k, v]) => (
        <View key={k} style={styles.planRow}>
          <Text style={styles.planKey}>{k}</Text>
          <Text style={styles.planVal}>{v}</Text>
        </View>
      ))}
      <Button
        label="Finish session early"
        onPress={() => {
          stopFocus();
          router.back();
        }}
      />
      <Text style={styles.footer}>Stay here. Your future self will thank you.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 80 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  end: { color: colors.accentLight, fontSize: 16, fontWeight: '600' },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 4 },
  ring: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 14,
    borderColor: colors.accent,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  time: { color: colors.text, fontSize: 48, fontWeight: '800' },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
  },
  until: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  paused: {
    backgroundColor: '#15163b',
    borderRadius: 20,
    padding: 16,
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pausedLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pausedText: { color: colors.text, fontSize: 14, fontWeight: '600', marginStart: 8 },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  planKey: { color: colors.textSecondary, fontSize: 15 },
  planVal: { color: colors.text, fontSize: 15, fontWeight: '600' },
  footer: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
