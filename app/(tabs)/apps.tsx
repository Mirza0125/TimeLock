import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '../../src/theme';
import { useStore } from '../../src/store';
import { useState } from 'react';

export default function Apps() {
  const store = useStore();
  const { toggleApp, setSelectedApp } = store;
  const apps = store.apps;
  const [q, setQ] = useState('');
  const filtered = apps.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Your apps</Text>
        <Text style={styles.edit}>Edit</Text>
      </View>
      <Text style={styles.sub}>Control time app by app.</Text>
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          placeholder="Search installed apps"
          placeholderTextColor={colors.textMuted}
          style={styles.searchText}
          value={q}
          onChangeText={setQ}
        />
      </View>
      <View style={styles.chips}>
        {['All apps', 'With limits', 'Blocked'].map((c, i) => (
          <View key={c} style={[styles.chip, i === 0 && styles.chipActive]}>
            <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>{c}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.label}>DAILY USAGE · 5 apps tracked</Text>
      {filtered.map((a) => (
        <Pressable
          key={a.name}
          style={styles.row}
          onPress={() => {
            setSelectedApp(a.id);
            router.push('/app-limit');
          }}
        >
          <View style={[styles.icon, { backgroundColor: a.color }]}>
            <Text style={styles.iconText}>{a.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{a.name}</Text>
            <Text style={styles.limit}>{a.enabled ? `Limit ${a.limit}m` : 'No limit'}</Text>
          </View>
          <Text style={styles.time}>{a.used}m</Text>
          <Pressable
            style={[styles.toggle, a.enabled ? styles.toggleOn : styles.toggleOff]}
            onPress={() => toggleApp(a.id)}
          >
            <View style={[styles.knob, a.enabled && styles.knobOn]} />
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  edit: { color: colors.accentLight, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.textSecondary, fontSize: 15, marginTop: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { color: colors.textMuted, fontSize: 22 },
  searchText: { color: colors.textMuted, fontSize: 15 },
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
  label: {
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  limit: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  time: { color: colors.text, fontSize: 16, fontWeight: '700', marginEnd: 8 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.accent },
  toggleOff: { backgroundColor: '#2d3158' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
});
