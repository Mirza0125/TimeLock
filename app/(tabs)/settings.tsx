import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/theme';

const rows = [
  {
    section: 'YOUR CONTROLS',
    items: [
      { icon: '◷', title: 'App limits', sub: 'Manage time across apps' },
      { icon: '◈', title: 'Focus schedules', sub: 'Set downtime and routines' },
      { icon: '♧', title: 'Family & children', sub: 'Profiles, requests and reports' },
    ],
  },
  {
    section: 'PREFERENCES',
    items: [
      { icon: '♧', title: 'Notifications', sub: 'Reminders and weekly summaries' },
      { icon: '◐', title: 'Appearance', sub: 'Dark mode · Violet theme' },
      { icon: '⌘', title: 'App permissions', sub: 'Review system access' },
    ],
  },
  {
    section: 'PRIVACY & SUPPORT',
    items: [
      { icon: '◇', title: 'Privacy & data', sub: 'Export or delete your data' },
      { icon: '?', title: 'Help & support', sub: 'FAQs and contact' },
      { icon: '↗', title: 'About DigiTame', sub: 'Version 1.0.0' },
    ],
  },
];

export default function Settings() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>Alex Morgan</Text>
          <Text style={styles.profileEmail}>alex@example.com</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </View>
      {rows.map((r) => (
        <View key={r.section}>
          <Text style={styles.section}>{r.section}</Text>
          {r.items.map((it) => (
            <View key={it.title} style={styles.row}>
              <View style={styles.rowIcon}>
                <Text style={styles.rowIconText}>{it.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{it.title}</Text>
                <Text style={styles.rowSub}>{it.sub}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={styles.signout}>
        <Text style={styles.signoutText}>Sign out</Text>
      </View>
      <Text style={styles.footer}>Made for a healthier relationship with technology.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 120 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 16 },
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#443078',
    borderWidth: 2,
    borderColor: '#9271ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  profileEmail: { color: colors.textSecondary, fontSize: 14 },
  chev: { color: colors.textMuted, fontSize: 24 },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
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
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#29205f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: { color: colors.accentLight, fontSize: 18, fontWeight: '700' },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  signout: {
    marginTop: 24,
    height: 56,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111433',
  },
  signoutText: { color: colors.accentLight, fontSize: 18, fontWeight: '600' },
  footer: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
