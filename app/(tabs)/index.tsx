import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '../../src/theme';
import { useStore } from '../../src/store';

export default function Home() {
  const { user, apps, setSelectedApp } = useStore();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning, {user?.name ?? 'Alex'}</Text>
          <Text style={styles.sub}>Small steps add up. You’re doing well.</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>TODAY’S SCREEN TIME</Text>
        <View style={styles.row}>
          <View style={styles.ring}>
            <Text style={styles.ringValue}>2h 15m</Text>
            <Text style={styles.ringSub}>of 4h goal</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.status}>You’re on track</Text>
            <Text style={styles.statusSub}>1h 45m left today</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>↓ 18% vs yesterday</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressLabel}>Daily goal progress</Text>
          </View>
        </View>
      </View>
      <Text style={styles.section}>Quick actions</Text>
      <View style={styles.quickRow}>
        {[
          { q: 'Set limits', r: '/(tabs)/apps' },
          { q: 'Block app', r: '/(tabs)/apps' },
          { q: 'Focus mode', r: '/focus' },
          { q: 'Family', r: '/(tabs)/family' },
        ].map((item, i) => (
          <Pressable key={item.q} style={styles.quick} onPress={() => router.push(item.r as any)}>
            <View style={styles.quickIcon}>
              <Text style={styles.quickIconText}>{['◷', '◈', '✦', '♧'][i]}</Text>
            </View>
            <Text style={styles.quickLabel}>{item.q}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Most used apps</Text>
        <Pressable onPress={() => router.push('/(tabs)/apps')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {apps.map((a) => (
        <Pressable
          key={a.id}
          style={styles.appRow}
          onPress={() => {
            setSelectedApp(a.id);
            router.push('/app-limit');
          }}
        >
          <View style={[styles.appIcon, { backgroundColor: a.color }]}>
            <Text style={styles.appIconText}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>{a.name}</Text>
            <Text style={styles.appCat}>{a.category}</Text>
            <View style={styles.appProgress}>
              <View style={[styles.appProgressFill, { width: '50%' }]} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.appTime}>{a.used}m</Text>
            <Text style={styles.appLimit}>{a.limit}m</Text>
          </View>
        </Pressable>
      ))}
      <View style={styles.insight}>
        <Text style={styles.insightTitle}>Your daily insight</Text>
        <Text style={styles.insightBody}>
          You’ve spent more time learning this week. Keep that momentum going.
        </Text>
        <Text style={styles.insightIcon}>✧</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2b2165',
    borderWidth: 2,
    borderColor: '#6d4bdd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  card: {
    backgroundColor: colors.panel2,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cardLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 16, marginTop: 16 },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  ringSub: { color: colors.textSecondary, fontSize: 11 },
  status: { color: colors.text, fontSize: 20, fontWeight: '700' },
  statusSub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  pill: {
    backgroundColor: '#1f2255',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { color: colors.success, fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 8, backgroundColor: '#282b58', borderRadius: 4, marginTop: 12 },
  progressFill: { width: '55%', height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  progressLabel: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.accentLight, fontSize: 15, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 12 },
  quick: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#33216f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickIconText: { color: colors.accentLight, fontSize: 20 },
  quickLabel: { color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  appRow: {
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
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  appName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  appCat: { color: colors.textSecondary, fontSize: 13 },
  appProgress: { height: 5, backgroundColor: '#282b58', borderRadius: 3, marginTop: 6 },
  appProgressFill: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  appTime: { color: colors.text, fontSize: 16, fontWeight: '700' },
  appLimit: { color: colors.accentLight, fontSize: 13 },
  insight: {
    backgroundColor: '#15163b',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  insightBody: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  insightIcon: { position: 'absolute', top: 16, end: 16, color: colors.accentLight, fontSize: 24 },
});
