import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/theme';
import { useStore } from '../../src/store';
import { router } from 'expo-router';

export default function Family() {
  const { children, setSelectedChild } = useStore();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Family dashboard</Text>
        <Text style={styles.add}>＋ Add</Text>
      </View>
      <Text style={styles.sub}>Everyone, in better balance.</Text>
      <View style={styles.parentCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.parentName}>Alex Morgan</Text>
          <Text style={styles.parentSub}>Parent account</Text>
        </View>
        <View style={styles.admin}>
          <Text style={styles.adminText}>Admin</Text>
        </View>
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Children</Text>
        <Text style={styles.manage}>Manage</Text>
      </View>
      {children.map((c) => (
        <Pressable
          key={c.id}
          style={styles.childCard}
          onPress={() => {
            setSelectedChild(c.id);
            router.push('/child-controls');
          }}
        >
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>{c.name[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>{c.name}</Text>
            <Text style={styles.childAge}>{c.age} years old</Text>
          </View>
          <View style={styles.active}>
            <Text style={styles.activeText}>Active</Text>
          </View>
          <Text style={styles.childTime}>{c.time}</Text>
          <View style={styles.childTrack}>
            <View style={[styles.childFill, { width: (String(c.progress * 100) + '%') as any }]} />
          </View>
          <Text style={styles.childGoal}>{c.goal}</Text>
        </Pressable>
      ))}
      <View style={styles.invite}>
        <View style={styles.inviteIcon}>
          <Text style={styles.inviteIconText}>＋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteTitle}>Invite a family member</Text>
          <Text style={styles.inviteSub}>Connect another child or guardian.</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </View>
      <Text style={styles.section}>Family insights</Text>
      <View style={styles.insightRow}>
        <View style={styles.insightCard}>
          <Text style={styles.insightValue}>3h 02m</Text>
          <Text style={styles.insightLabel}>Average daily use</Text>
          <Text style={styles.insightDelta}>↓ 14% this week</Text>
        </View>
        <View style={styles.insightCard}>
          <Text style={styles.insightValue}>5 of 7 days</Text>
          <Text style={styles.insightLabel}>Within daily goals</Text>
          <Text style={styles.insightDelta2}>Great consistency</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  add: { color: colors.accentLight, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.textSecondary, fontSize: 15, marginTop: 4 },
  parentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel2,
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#a76bcb',
    borderWidth: 2,
    borderColor: '#d6b4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  parentName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  parentSub: { color: colors.textSecondary, fontSize: 14 },
  admin: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  adminText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  section: { color: colors.text, fontSize: 20, fontWeight: '700' },
  manage: { color: colors.accentLight, fontSize: 15, fontWeight: '600' },
  childCard: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#403071',
    borderWidth: 2,
    borderColor: '#8e63ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  childName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  childAge: { color: colors.textSecondary, fontSize: 13 },
  active: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  activeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  childTime: { color: colors.text, fontSize: 20, fontWeight: '700', alignSelf: 'flex-end' },
  childTrack: { height: 6, backgroundColor: '#282b58', borderRadius: 3 },
  childFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  childGoal: { color: colors.textMuted, fontSize: 12 },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel2,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#33206d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteIconText: { color: colors.accentLight, fontSize: 24, fontWeight: '700' },
  inviteTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  inviteSub: { color: colors.textSecondary, fontSize: 13 },
  chev: { color: colors.textMuted, fontSize: 24 },
  insightRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  insightCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  insightLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  insightDelta: { color: colors.success, fontSize: 13, fontWeight: '700', marginTop: 8 },
  insightDelta2: { color: colors.accentLight, fontSize: 13, fontWeight: '700', marginTop: 8 },
});
