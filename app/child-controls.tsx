import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';
import { useStore } from '../src/store';

export default function ChildControls() {
  const { children, selectedChild } = useStore();
  const child = children.find((c) => c.id === (selectedChild ?? 'emma')) ?? children[0];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{child.name}’s controls</Text>
        <Text style={styles.menu}>⋯</Text>
      </View>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child.name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{child.name}</Text>
          <Text style={styles.age}>Age 12 · Child profile</Text>
        </View>
        <View style={styles.online}>
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>
      <View style={styles.timeCard}>
        <Text style={styles.timeLabel}>TODAY’S SCREEN TIME</Text>
        <Text style={styles.timeValue}>{child.time}</Text>
        <Text style={styles.timeSub}>of {child.goal}</Text>
        <View style={styles.track}>
          <View style={styles.fill} />
        </View>
        <Text style={styles.timeLeft}>48 minutes left</Text>
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>App limits</Text>
        <Text style={styles.edit}>Edit all</Text>
      </View>
      {[
        { name: 'YouTube', limit: '1h 30m limit', used: '1h 20m', color: '#ff355d', icon: '▶' },
        { name: 'TikTok', limit: '1h limit', used: '56m', color: '#111827', icon: '♪' },
        { name: 'Instagram', limit: '1h limit', used: '42m', color: '#ce3fff', icon: '◎' },
        { name: 'Roblox', limit: '45m limit', used: '24m', color: '#7758ff', icon: 'R' },
        { name: 'WhatsApp', limit: '30m limit', used: '18m', color: '#13c98a', icon: '↗' },
      ].map((a) => (
        <View key={a.name} style={styles.appRow}>
          <View style={[styles.appIcon, { backgroundColor: a.color }]}>
            <Text style={styles.appIconText}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>{a.name}</Text>
            <Text style={styles.appLimit}>{a.limit}</Text>
          </View>
          <Text style={styles.appUsed}>{a.used}</Text>
          <Text style={styles.chev}>›</Text>
        </View>
      ))}
      <Button label="＋ Add app limit" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', flex: 1 },
  menu: { color: colors.accentLight, fontSize: 22, fontWeight: '700' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8e60c7',
    borderWidth: 2,
    borderColor: '#d4b6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  age: { color: colors.textSecondary, fontSize: 14 },
  online: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  onlineText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  timeCard: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  timeValue: { color: colors.text, fontSize: 36, fontWeight: '800', marginTop: 8 },
  timeSub: { color: colors.textSecondary, fontSize: 14 },
  track: { height: 8, backgroundColor: '#282b58', borderRadius: 4, marginTop: 12 },
  fill: { width: '79%', height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  timeLeft: { color: colors.accentLight, fontSize: 15, fontWeight: '700', marginTop: 8 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  section: { color: colors.text, fontSize: 20, fontWeight: '700' },
  edit: { color: colors.accentLight, fontSize: 15, fontWeight: '600' },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  appName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  appLimit: { color: colors.textSecondary, fontSize: 12 },
  appUsed: { color: colors.text, fontSize: 16, fontWeight: '700' },
  chev: { color: colors.textMuted, fontSize: 20 },
});
