import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';
import { useStore } from '../src/store';

export default function Permissions() {
  const { permissions, setPermission } = useStore();
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Set up permissions</Text>
      </View>
      <Text style={styles.h1}>A few quick setup steps.</Text>
      <Text style={styles.body}>These allow DigiTame to apply your chosen limits.</Text>
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>✓</Text>
        <View>
          <Text style={styles.bannerTitle}>Privacy-first setup</Text>
          <Text style={styles.bannerSub}>You stay in control of every permission.</Text>
        </View>
      </View>
      {[
        {
          key: 'usage' as const,
          icon: '◷',
          title: 'Usage access',
          sub: 'Measure time spent in each app',
        },
        {
          key: 'restrictions' as const,
          icon: '◈',
          title: 'App restrictions',
          sub: 'Pause apps when a limit is reached',
        },
        {
          key: 'notifications' as const,
          icon: '♧',
          title: 'Notifications',
          sub: 'Get helpful reminders and reports',
        },
      ].map((p) => (
        <View key={p.title} style={styles.card}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>{p.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardSub}>{p.sub}</Text>
          </View>
          <Pressable
            style={[styles.pill, permissions[p.key] ? styles.pillOn : styles.pillOff]}
            onPress={() => setPermission(p.key, !permissions[p.key])}
          >
            <Text style={styles.pillText}>{permissions[p.key] ? 'Enabled' : 'Enable'}</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.why}>
        <Text style={styles.whyTitle}>Why we ask</Text>
        <Text style={styles.whyBody}>
          Permissions are used only for the controls you choose. You can review or revoke access in
          Settings.
        </Text>
      </View>
      <Button label="Continue to settings  →" onPress={() => router.push('/(tabs)')} />
      <Text style={styles.footer}>You can also finish setup later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: colors.text, fontSize: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800' },
  body: { color: colors.textSecondary, fontSize: 15 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#191943',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4e3b9b',
  },
  bannerIcon: { color: colors.accentLight, fontSize: 24, fontWeight: '800' },
  bannerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  bannerSub: { color: colors.textSecondary, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#24205f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.accentLight, fontSize: 22 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillOn: { backgroundColor: colors.accent },
  pillOff: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  why: {
    backgroundColor: '#111432',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  whyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  whyBody: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  footer: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
});
