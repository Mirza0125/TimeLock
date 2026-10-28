import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/theme';

const bars = [90, 120, 78, 144, 104, 58, 47];

export default function Stats() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Usage insights</Text>
        <Text style={styles.menu}>⋯</Text>
      </View>
      <View style={styles.chips}>
        {['Day', 'Week', 'Month'].map((c, i) => (
          <View key={c} style={[styles.chip, i === 1 && styles.chipActive]}>
            <Text style={[styles.chipText, i === 1 && styles.chipTextActive]}>{c}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.period}>This week</Text>
      <View style={styles.totalRow}>
        <Text style={styles.total}>18h 45m</Text>
        <Text style={styles.delta}>↓ 12%</Text>
      </View>
      <Text style={styles.deltaSub}>vs last week</Text>
      <View style={styles.chart}>
        <Text style={styles.chartLabel}>SCREEN TIME BY DAY</Text>
        <View style={styles.bars}>
          {bars.map((b, i) => (
            <View key={i} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: b, backgroundColor: i === 3 ? colors.accent : '#5553c8' },
                ]}
              />
              <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.peak}>Peak usage: Thursday</Text>
      </View>
      <Text style={styles.section}>Usage breakdown</Text>
      {[
        { t: 'Social', sub: 'Instagram + TikTok', time: '6h 10m', w: '74%' },
        { t: 'Video', sub: 'YouTube + streaming', time: '4h 25m', w: '53%' },
        { t: 'Productivity', sub: 'Work & learning', time: '3h 40m', w: '42%' },
      ].map((b) => (
        <View key={b.t} style={styles.breakRow}>
          <Text style={styles.breakTitle}>{b.t}</Text>
          <Text style={styles.breakSub}>{b.sub}</Text>
          <Text style={styles.breakTime}>{b.time}</Text>
          <View style={styles.breakTrack}>
            <View style={[styles.breakFill, { width: b.w as any }]} />
          </View>
        </View>
      ))}
      <View style={styles.insight}>
        <Text style={styles.insightTitle}>Your insight</Text>
        <Text style={styles.insightBody}>Try a 20-minute evening screen-time reset.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  menu: { color: colors.accentLight, fontSize: 24, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 10, marginTop: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  period: { color: colors.textSecondary, fontSize: 16, marginTop: 20 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  total: { color: colors.text, fontSize: 40, fontWeight: '800' },
  delta: { color: colors.success, fontSize: 20, fontWeight: '800' },
  deltaSub: { color: colors.textMuted, fontSize: 14, textAlign: 'auto' },
  chart: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    marginTop: 16,
  },
  barCol: { alignItems: 'center', gap: 6 },
  bar: { width: 32, borderRadius: 8 },
  barLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  peak: { color: colors.textSecondary, fontSize: 13, marginTop: 12 },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  breakRow: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  breakSub: { color: colors.textSecondary, fontSize: 13 },
  breakTime: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    position: 'absolute',
    top: 14,
    end: 14,
  },
  breakTrack: { height: 5, backgroundColor: '#282b58', borderRadius: 3, marginTop: 8 },
  breakFill: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  insight: {
    backgroundColor: '#171640',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  insightTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  insightBody: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
});
