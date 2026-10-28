import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../src/theme';

export default function WeeklyReport() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Weekly report</Text>
        <Text style={styles.share}>Share</Text>
      </View>
      <Text style={styles.range}>APR 20 – APR 26</Text>
      <Text style={styles.headline}>Your week at a glance</Text>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>TOTAL SCREEN TIME</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroValue}>18h 45m</Text>
          <View style={styles.delta}>
            <Text style={styles.deltaText}>↓ 8% this week</Text>
          </View>
        </View>
        <Text style={styles.heroSub}>You spent 1h 38m less than last week.</Text>
      </View>
      <View style={styles.chart}>
        <Text style={styles.chartLabel}>DAILY TREND</Text>
        <View style={styles.line} />
        <View style={styles.days}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
            <Text key={d} style={styles.day}>
              {d}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Top apps</Text>
        <Text style={styles.seeAll}>Full report</Text>
      </View>
      {[
        { name: 'YouTube', cat: 'Video', time: '6h 12m', w: '81%' },
        { name: 'TikTok', cat: 'Short videos', time: '4h 20m', w: '62%' },
        { name: 'Instagram', cat: 'Social', time: '3h 45m', w: '55%' },
        { name: 'WhatsApp', cat: 'Messaging', time: '2h 10m', w: '36%' },
      ].map((a) => (
        <View key={a.name} style={styles.appRow}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>{a.name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>{a.name}</Text>
            <Text style={styles.appCat}>{a.cat}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: a.w as any }]} />
            </View>
          </View>
          <Text style={styles.appTime}>{a.time}</Text>
        </View>
      ))}
      <Text style={styles.footer}>Small improvements add up. Keep going.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 80 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  share: { color: colors.accentLight, fontSize: 16, fontWeight: '600' },
  range: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
  },
  headline: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  hero: {
    backgroundColor: colors.panel2,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  heroLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  heroValue: { color: colors.text, fontSize: 40, fontWeight: '800' },
  delta: {
    backgroundColor: '#173c47',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#24695e',
  },
  deltaText: { color: colors.success, fontSize: 14, fontWeight: '800' },
  heroSub: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  chart: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  line: { height: 120, marginTop: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  day: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  section: { color: colors.text, fontSize: 20, fontWeight: '700' },
  seeAll: { color: colors.accentLight, fontSize: 15, fontWeight: '600' },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  appName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  appCat: { color: colors.textSecondary, fontSize: 12 },
  track: { height: 4, backgroundColor: '#282b58', borderRadius: 2, marginTop: 6 },
  fill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  appTime: { color: colors.text, fontSize: 15, fontWeight: '700' },
  footer: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 },
});
