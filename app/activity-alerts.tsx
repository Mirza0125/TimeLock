import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../src/theme';

export default function ActivityAlerts() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Activity & alerts</Text>
        <Text style={styles.mark}>Mark all read</Text>
      </View>
      <View style={styles.chips}>
        {['All', 'Requests', 'Limit alerts'].map((c, i) => (
          <View key={c} style={[styles.chip, i === 0 && styles.chipActive]}>
            <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>{c}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.group}>TODAY</Text>
      <View style={styles.alert}>
        <View style={[styles.alertIcon, { backgroundColor: '#8e5dff' }]}>
          <Text style={styles.alertIconText}>↗</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>Emma requested more time</Text>
          <Text style={styles.alertSub}>YouTube · 15 additional minutes</Text>
          <Text style={styles.alertTime}>2 min ago</Text>
        </View>
        <View style={styles.actions}>
          <View style={styles.deny}>
            <Text style={styles.denyText}>Deny</Text>
          </View>
          <View style={styles.approve}>
            <Text style={styles.approveText}>Approve</Text>
          </View>
        </View>
      </View>
      <View style={styles.alert}>
        <View style={[styles.alertIcon, { backgroundColor: '#ff6b98' }]}>
          <Text style={styles.alertIconText}>◷</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>Daily limit reached</Text>
          <Text style={styles.alertSub}>Noah reached his Roblox limit</Text>
          <Text style={styles.alertTime}>18 min ago</Text>
        </View>
      </View>
      <View style={styles.alert}>
        <View style={[styles.alertIcon, { backgroundColor: '#21c9a5' }]}>
          <Text style={styles.alertIconText}>✓</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>Focus goal completed</Text>
          <Text style={styles.alertSub}>Alex finished a 30-minute session</Text>
          <Text style={styles.alertTime}>1h ago</Text>
        </View>
      </View>
      <Text style={styles.group}>EARLIER THIS WEEK</Text>
      <View style={styles.simple}>
        <View style={styles.dot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.simpleTitle}>Emma stayed within her goal</Text>
          <Text style={styles.simpleSub}>Screen time was 3h 40m</Text>
        </View>
        <Text style={styles.simpleTime}>Yesterday</Text>
      </View>
      <View style={styles.simple}>
        <View style={styles.dot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.simpleTitle}>Weekly summary generated</Text>
          <Text style={styles.simpleSub}>Total family screen time decreased 8%</Text>
        </View>
        <Text style={styles.simpleTime}>Monday</Text>
      </View>
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
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  mark: { color: colors.accentLight, fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 10, marginBottom: 16 },
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
  group: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 8,
  },
  alert: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  alertTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  alertSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  alertTime: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deny: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  denyText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  approve: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  approveText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  simple: {
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
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  simpleTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  simpleSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  simpleTime: { color: colors.textMuted, fontSize: 12 },
});
