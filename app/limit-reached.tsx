import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme';

export default function LimitReached() {
  return (
    <View style={styles.root}>
      <View style={styles.glow} />
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>⌛</Text>
      </View>
      <Text style={styles.title}>Time limit reached</Text>
      <Text style={styles.body}>You’ve reached today’s limit for</Text>
      <Text style={styles.app}>YouTube.</Text>
      <View style={styles.info}>
        <Text style={styles.infoLabel}>DAILY LIMIT · 1H 30M</Text>
        <Text style={styles.infoValue}>Resets tomorrow at 12:00 AM</Text>
      </View>
      <Text style={styles.hint}>A short break can help you reset.</Text>
      <Button label="Take a mindful break" onPress={() => {}} />
      <Text style={styles.footer}>Your time is protected by DigiTame.</Text>
      <View style={styles.wave}>
        <Text style={styles.waveText}>Pause. Breathe. Choose what matters.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', padding: 24 },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#762dff',
    opacity: 0.2,
    top: 120,
  },
  iconWrap: {
    marginTop: 140,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#22185c',
    borderWidth: 3,
    borderColor: '#7049e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: '#e6c7ff', fontSize: 72 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 32 },
  body: { color: colors.textSecondary, fontSize: 17, marginTop: 8 },
  app: { color: colors.accentLight, fontSize: 22, fontWeight: '800' },
  info: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  infoValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  hint: { color: colors.textSecondary, fontSize: 16, marginTop: 24 },
  footer: { color: colors.textMuted, fontSize: 14, marginTop: 24 },
  wave: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    height: 120,
    backgroundColor: '#21105f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveText: { color: '#d7d0ff', fontSize: 15, fontWeight: '600' },
});
